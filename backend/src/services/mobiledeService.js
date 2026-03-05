import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { addToQueue } from './mobileDeQueueService.js';
import { fetchViaScrapeDo, isScrapeDoAvailable, isPageBlocked } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import { launchBrowser } from '../utils/puppeteerLaunch.js';

const SOURCE_PLATFORM = 'mobile.de';

/**
 * Run mobile.de scraper (Puppeteer) et envoie vers Ingest API
 * Flux : scrape → raw_listings → processRawListings → listings
 */
export async function runMobileDeScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = {
    totalScraped: 0,
    saved: 0,
    errors: 0,
    processedUrls: []
  };

  try {
    const maxPages = options.maxPages ?? parseInt(process.env.MOBILEDE_MAX_PAGES || '100', 10);
    const useScrapeDo = isScrapeDoAvailable();

    logger.info('Starting mobile.de scraper', { searchUrls, options, useScrapeDo });

    // Only launch browser when needed (Puppeteer fallback). Scrape.do path doesn't need it.
    if (!useScrapeDo) {
      browser = await launchBrowser();
    }

    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping mobile.de URL', { url: searchUrl });

        const listings = await scrapeMobileDeUrl(browser, searchUrl, maxPages, useScrapeDo);

        logger.info('mobile.de scraping completed', {
          url: searchUrl,
          listingsFound: listings.length
        });

        if (listings.length > 0) {
          // Alimenter la queue pour les workers (remplace Oleg)
          const queueItems = listings.map((l) => ({
            url: l.url,
            title: l.title,
            year: l.year,
            price: l.price,
            mileage: l.mileage,
            images: l.images || l.imageUrls || []
          }));
          const { added } = await addToQueue(queueItems);
          if (added > 0) logger.debug('mobile.de: added to queue', { added });

          // Stage 1: raw_listings (pour debugging, re-processing)
          const { saved } = await saveRawListings(listings, SOURCE_PLATFORM);
          results.totalScraped += listings.length;

          // Stage 2: raw → listings (mapper + upsert)
          const processResult = await processRawListings({
            limit: 5000,
            sourcePlatform: SOURCE_PLATFORM
          });
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);
        }

        results.processedUrls.push(searchUrl);

        if (progressCallback) {
          await progressCallback({
            totalScraped: results.totalScraped,
            totalSaved: results.saved,
            status: 'RUNNING',
            processedUrls: results.processedUrls
          });
        }
      } catch (error) {
        logger.error('Error scraping mobile.de URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('mobile.de scraper completed', results);
    return {
      runId: null,
      totalScraped: results.totalScraped,
      saved: results.saved,
      processedUrls: results.processedUrls
    };
  } catch (error) {
    logger.error('Error in mobile.de scraper', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Build paginated URL for mobile.de search.
 * search.html uses pageNumber; detailsuche may use different param.
 */
function buildMobileDePageUrl(baseUrl, pageNum) {
  if (pageNum <= 1) return baseUrl;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}pageNumber=${pageNum}`;
}

/**
 * Scrape une URL de recherche mobile.de
 * mobile.de a une protection anti-bot forte (Datadome, contenu JS). On privilégie scrape.do si disponible.
 */
async function scrapeMobileDeUrl(browser, url, maxPages = 10, useScrapeDo = null) {
  const allListings = [];
  const useScraper = useScrapeDo ?? isScrapeDoAvailable();

  // 1. Si scrape.do est dispo : l'utiliser en priorité (mobile.de bloque souvent Puppeteer)
  if (useScraper) {
    const concurrency = parseInt(process.env.MOBILEDE_CONCURRENT_PAGES || '8', 10) || 1;
    const batchDelayMs = parseInt(process.env.MOBILEDE_BATCH_DELAY_MS || '1200', 10) || 0;
    logger.info('mobile.de: using scrape.do (parallel)', { concurrency, maxPages, batchDelayMs });
    for (let start = 1; start <= maxPages; start += concurrency) {
      const pageNums = [];
      for (let i = 0; i < concurrency && start + i <= maxPages; i++) {
        pageNums.push(start + i);
      }
      const batchResults = await Promise.all(
        pageNums.map((pageNum) => scrapeMobileDeSearchViaScraper(buildMobileDePageUrl(url, pageNum)))
      );
      let hadEmpty = false;
      for (let i = 0; i < batchResults.length; i++) {
        let scraped = batchResults[i];
        if (scraped.length === 0) hadEmpty = true;
        // Retry empty page once (rate limit may return empty)
        if (scraped.length === 0 && start > 1 && batchResults.some((s) => s.length > 0)) {
          logger.warn('mobile.de: empty page, retrying after delay', { page: pageNums[i] });
          await new Promise((r) => setTimeout(r, 5000));
          scraped = await scrapeMobileDeSearchViaScraper(buildMobileDePageUrl(url, pageNums[i]));
        }
        allListings.push(...scraped);
        if (scraped.length > 0) {
          logger.info('mobile.de page scraped via scrape.do', { page: pageNums[i], found: scraped.length });
        }
      }
      if (hadEmpty && batchResults[0]?.length === 0) break;
      if (pageNums.length < concurrency) break;
      if (batchDelayMs > 0 && start + concurrency <= maxPages) {
        await new Promise((r) => setTimeout(r, batchDelayMs));
      }
    }
    return allListings;
  }

  // 2. Fallback Puppeteer
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.mobile.de/'
    });

    let currentPage = 1;

    while (currentPage <= maxPages) {
      const pageUrl = buildMobileDePageUrl(url, currentPage);

      let gotoOk = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 60000 });
          gotoOk = true;
          break;
        } catch (e) {
          logger.warn('mobile.de page.goto retry', { page: currentPage, attempt, error: e.message });
          if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
          else { logger.warn('mobile.de page.goto failed after 3 attempts, skipping page', { page: currentPage }); }
        }
      }
      if (!gotoOk) { currentPage++; continue; }
      await new Promise(r => setTimeout(r, 5000));

      if (await isPageBlocked(page)) {
        logger.warn('mobile.de page blocked, falling back to scrape.do', { page: currentPage });
        const scraped = await scrapeMobileDeSearchViaScraper(pageUrl);
        if (scraped.length === 0) break;
        allListings.push(...scraped);
        logger.info('mobile.de page scraped via scrape.do', { page: currentPage, found: scraped.length });
        currentPage++;
        continue;
      }

      const pageListings = await page.evaluate(() => {
        const items = [];
        const selectors = [
          'a[href*="/fahrzeuge/details/"]',
          '[data-testid*="listing"]',
          '[class*="listing-card"]',
          '[class*="ListingCard"]',
          'article[class*="result"]',
          '[class*="SearchResult"]'
        ];

        let links = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) {
            links = Array.from(found);
            break;
          }
        }

        if (links.length === 0) {
          links = Array.from(document.querySelectorAll('a[href*="/fahrzeuge/details/"]'));
        }

        const seen = new Set();
        links.forEach((el) => {
          const a = el.tagName === 'A' ? el : el.querySelector('a[href*="/fahrzeuge/details/"]');
          if (!a) return;
          const href = a.href || a.getAttribute('href');
          if (!href || seen.has(href)) return;

          const idMatch = href.match(/\/details\/(\d+)/);
          const sourceListingId = idMatch ? idMatch[1] : null;
          if (!sourceListingId) return;
          seen.add(href);

          const card = el.closest('[class*="card"], [class*="result"], [class*="listing"], article') || el;
          const text = card.textContent || '';
          const priceMatch = text.match(/(\d{1,3}(?:\.\d{3})*)\s*€/);
          const kmMatch = text.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
          const yearMatch = text.match(/\b(19|20)\d{2}\b/);

          const titleEl = card.querySelector('h2, h3, [class*="title"], [class*="Title"]') || a;
          const title = titleEl?.textContent?.trim() || '';

          const makeModel = title.split(/\s+/);
          const brand = makeModel[0] || null;
          const model = makeModel.slice(1).join(' ') || null;

          items.push({
            url: href.startsWith('http') ? href : `https://www.mobile.de${href}`,
            id: sourceListingId,
            brand,
            model,
            price: priceMatch ? parseInt(priceMatch[1].replace(/\./g, ''), 10) : null,
            mileage: kmMatch ? parseInt(kmMatch[1].replace(/\./g, ''), 10) : null,
            year: yearMatch ? parseInt(yearMatch[0], 10) : null,
            title
          });
        });

        return items;
      });

      const valid = pageListings.filter((i) => i.url && i.id);
      allListings.push(...valid);

      if (valid.length === 0) break;

      logger.info('mobile.de page scraped', { page: currentPage, found: valid.length });
      currentPage++;
    }

    return allListings;
  } finally {
    await page.close();
  }
}

const BASE_URL = 'https://suchen.mobile.de';

/**
 * Extract listings from window.__INITIAL_STATE__ (Oleg approach - structured JSON, no render needed).
 * Path: search.srp.data.searchResults.items
 */
function extractFromInitialState(html) {
  const idx = html.indexOf('window.__INITIAL_STATE__');
  if (idx === -1) return null;
  const start = html.indexOf('=', idx) + 1;
  const end = html.indexOf('window.__PUBLIC_CONFIG__', start);
  const jsonStr = (end > start ? html.slice(start, end) : html.slice(start)).trim().replace(/;\s*$/, '');
  if (!jsonStr || jsonStr.length < 100) return null;
  try {
    const state = JSON.parse(jsonStr);
    const items = state?.search?.srp?.data?.searchResults?.items;
    if (!Array.isArray(items)) return null;
    const listings = [];
    const seen = new Set();
    for (const car of items) {
      const title = car?.title;
      if (!title) continue;
      const rel = car?.relativeUrl;
      if (!rel) continue;
      const idMatch = rel.match(/\/details\/(\d+)/) || rel.match(/\/datenblatt\/(\d+)/) || rel.match(/[?&]id=(\d+)/);
      const id = idMatch ? idMatch[1] : null;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const fullUrl = rel.startsWith('http') ? rel : `${BASE_URL}${rel.startsWith('/') ? rel : '/' + rel}`;
      const fr = car?.attr?.fr;
      const year = fr && fr.includes('/') ? parseInt(fr.split('/')[1], 10) : null;
      const ml = car?.attr?.ml;
      const mileage = ml ? parseInt(String(ml).replace(/[.\s\xa0]/g, '').replace(/km/gi, ''), 10) : null;
      const price = car?.price?.grossAmount ?? null;
      const parts = title.split(/\s+/);
      listings.push({
        url: fullUrl,
        id,
        brand: parts[0] || null,
        model: parts.slice(1).join(' ') || null,
        price: typeof price === 'number' ? price : (price ? parseInt(String(price).replace(/\D/g, ''), 10) : null),
        mileage: Number.isNaN(mileage) ? null : mileage,
        year: (year && year >= 1900 && year <= 2030) ? year : null,
        title,
      });
    }
    return listings;
  } catch (e) {
    logger.debug('mobile.de: __INITIAL_STATE__ parse failed', { error: e.message });
    return null;
  }
}

/**
 * Fallback: parse HTML with cheerio (when __INITIAL_STATE__ not present or blocked).
 */
function parseListingsFromHtml(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();
  const linkSelectors = [
    'a[href*="/fahrzeuge/details/"]',
    'a[href*="details.html"]',
    'a[href*="datenblatt"]',
    'a[href*="mobile.de"][href*="id="]',
    '[data-testid*="listing"] a[href*="/fahrzeuge/"]',
    'a[href*="mobile.de/fahrzeuge/"]'
  ].join(', ');
  $(linkSelectors).each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const idMatch = href.match(/\/details\/(\d+)/) || href.match(/\/datenblatt\/(\d+)/) || href.match(/[?&]id=(\d+)/);
    if (!idMatch || seen.has(idMatch[1])) return;
    seen.add(idMatch[1]);
    const card = $(el).closest('[class*="card"], [class*="result"], [class*="listing"], article') || $(el);
    const text = card.text();
    const titleEl = card.find('h2, h3, [class*="title"], [class*="Title"]').first();
    const title = titleEl.text().trim() || $(el).text().trim();
    const priceMatch = text.match(/(\d{1,3}(?:\.\d{3})*)\s*€/) || text.match(/€\s*(\d{1,3}(?:\.\d{3})*)/);
    const kmMatch = text.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    const parts = title.split(/\s+/);
    let fullUrl = href.startsWith('http') ? href : href.startsWith('/') ? `${BASE_URL}${href}` : `${BASE_URL}/${href}`;
    if (!fullUrl.includes('mobile.de')) fullUrl = `https://suchen.mobile.de${href.startsWith('/') ? href : '/' + href}`;
    listings.push({
      url: fullUrl,
      id: idMatch[1],
      brand: parts[0] || null,
      model: parts.slice(1).join(' ') || null,
      price: priceMatch ? parseInt(priceMatch[1].replace(/\./g, ''), 10) : null,
      mileage: kmMatch ? parseInt(kmMatch[1].replace(/\./g, ''), 10) : null,
      year: yearMatch ? parseInt(yearMatch[0], 10) : null,
      title,
    });
  });
  return listings;
}

async function scrapeMobileDeSearchViaScraper(pageUrl) {
  if (!isScrapeDoAvailable()) return [];
  const opts = { geoCode: 'de', superProxy: true };
  try {
    // 1. Try without render first (Oleg approach - __INITIAL_STATE__ is in initial HTML, faster & cheaper)
    let html = await fetchViaScrapeDo(pageUrl, { ...opts, render: false });
    let listings = extractFromInitialState(html);
    if (listings && listings.length > 0) {
      logger.debug('mobile.de: extracted from __INITIAL_STATE__ (no render)', { count: listings.length });
      return listings;
    }
    listings = parseListingsFromHtml(html);
    if (listings.length > 0) return listings;

    // 2. Fallback: render=true if blocked or empty (anti-bot may not serve JSON without JS)
    if (html && html.length > 500) {
      logger.debug('mobile.de: trying with render=true', { url: pageUrl });
      html = await fetchViaScrapeDo(pageUrl, { ...opts, render: true, customWait: 6000 });
      listings = extractFromInitialState(html) || parseListingsFromHtml(html);
    }
    return listings || [];
  } catch (err) {
    logger.warn('scrape.do search failed for mobile.de', { error: err.message, url: pageUrl });
    return [];
  }
}

/**
 * Map mobile.de scraper data to our database schema
 * (Utilisé par rawListingsProcessorService et pour l'ingest)
 */
export function mapMobileDeDataToListing(item, sourcePlatform = 'mobile.de') {
  const urlMatch = item.url?.match(/\/details\/(\d+)/);
  const sourceListingId = urlMatch
    ? urlMatch[1]
    : item.ad_id
      ? String(item.ad_id)
      : item.id || item.url;

  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price.value || item.price.amount || item.price.price || 0;
  } else if (typeof item.price === 'string') {
    priceValue = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
  } else {
    priceValue = item.price || item.priceValue || item.priceAmount || item.price_amount || 0;
  }
  const price = parseFloat(priceValue) || 0;

  let mileageValue = item.mileage || item.kilometer || item.km || 0;
  if (typeof mileageValue === 'string') {
    mileageValue = parseInt(mileageValue.replace(/[^\d]/g, ''), 10);
  }
  const mileage = parseInt(mileageValue) || 0;

  let yearValue = item.firstRegistration || item.first_registration || item.erstzulassung || item.year;
  if (typeof yearValue === 'string') {
    const m = yearValue.match(/\b(19|20)\d{2}\b/);
    yearValue = m ? parseInt(m[0], 10) : parseInt(yearValue, 10);
  }
  let year = parseInt(yearValue) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;
  if (!year) year = currentYear;

  const location = item.location || item.standort || {};
  const locationCity = item.city || location.city || location.stadt || location.name || null;
  const locationRegion = item.region || location.region || location.bundesland || (locationCity ? 'Allemagne' : null);

  const fuelTypeMap = {
    diesel: 'diesel', benzin: 'petrol', petrol: 'petrol',
    elektro: 'electric', electric: 'electric', hybrid: 'hybrid'
  };
  const fuelTypeRaw = (item.fuelType || item.fuel_type || item.kraftstoff || '').toLowerCase();
  const fuelType = fuelTypeMap[fuelTypeRaw] || fuelTypeRaw || null;

  const transmissionMap = {
    automatik: 'automatic', automatic: 'automatic',
    schaltgetriebe: 'manual', manual: 'manual'
  };
  const transmissionRaw = (item.transmission || item.getriebe || '').toLowerCase();
  const transmission = transmissionMap[transmissionRaw] || transmissionRaw || null;

  const normalizedBrand = (item.brand || item.marke || item.make || null)?.toLowerCase() || null;
  const normalizedModel = (item.model || null)?.toLowerCase() || null;

  const drivetrainMap = {
    frontantrieb: 'fwd', allradantrieb: 'awd', hinterradantrieb: 'rwd',
    allrad: 'awd', '4x4': 'awd'
  };
  const features = Array.isArray(item.features) ? item.features : [];
  let drivetrain = item.drivetrain || item.antrieb || null;
  if (!drivetrain && features.length) {
    for (const f of features) {
      const key = (typeof f === 'string' ? f : '').toLowerCase();
      if (drivetrainMap[key]) { drivetrain = drivetrainMap[key]; break; }
    }
  }

  return {
    source_platform: sourcePlatform,
    source_listing_id: String(sourceListingId),
    brand: normalizedBrand,
    model: normalizedModel,
    year,
    mileage,
    price,
    currency: item.currency || 'EUR',
    location_city: locationCity,
    location_region: locationRegion,
    location_country: item.country ? String(item.country).toUpperCase().slice(0, 2) : 'DE',
    location_latitude: location.latitude || location.lat || null,
    location_longitude: location.longitude || location.lng || null,
    seller_type: item.seller_type
      ? (String(item.seller_type).toUpperCase() === 'DEALER' ? 'professional' : 'private')
      : (item.dealerName || item.haendler ? 'professional' : 'private'),
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : item.imageUrls ? [item.imageUrls].flat() : [],
    specifications: { ...(item.attributes || {}), ...(item.features || {}) },
    description: item.description || item.text || null,
    posted_date: item.postedDate || item.date ? new Date(item.postedDate || item.date) : new Date(),
    fuel_type: fuelType,
    transmission,
    color: item.color || item.farbe || null,
    doors: parseInt(item.doors || item.tueren, 10) || null,
    power_hp: parseInt(item.power || item.ps, 10) || null,
    displacement: (() => {
      const v = item.displacement ?? item.engine_size ?? item.hubraum;
      if (v == null) return null;
      const n = parseFloat(v);
      if (Number.isNaN(n)) return null;
      return n > 100 ? n / 1000 : n;
    })(),
    version: item.version || null,
    trim: item.trim || null,
    category: item.category || item.vehicle_type || item.fahrzeugtyp || null,
    drivetrain
  };
}
