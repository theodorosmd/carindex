import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo, isScrapeDoAvailable, isPageBlocked } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import { launchBrowser } from '../utils/puppeteerLaunch.js';
import { FRENCH_DEPT_TO_REGION } from '../utils/locationUtils.js';

const SOURCE_PLATFORM = 'lacentrale';
const BASE_URL = 'https://www.lacentrale.fr';

/**
 * Run La Centrale scraper
 * Uses scrape.do (like leboncoin) with Puppeteer fallback (like mobile.de)
 * Flux: scrape → raw_listings → processRawListings → listings
 */
export async function runLaCentraleScraper(searchUrls, options = {}, progressCallback = null) {
  const results = { totalScraped: 0, saved: 0, errors: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 15;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting La Centrale scraper', { urls, options });

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping La Centrale URL', { url: searchUrl });

        await scrapeLaCentraleStreaming(searchUrl, maxPages, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          await saveRawListings(pageListings, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: pageListings.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += pageListings.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('La Centrale batch saved', {
            page: pageNum,
            batchSize: pageListings.length,
            totalScraped: results.totalScraped,
            totalSaved: results.saved
          });

          if (progressCallback) {
            await progressCallback({
              totalScraped: results.totalScraped,
              totalSaved: results.saved,
              status: 'RUNNING',
              processedUrls: results.processedUrls
            });
          }
        });

        results.processedUrls.push(searchUrl);
      } catch (error) {
        logger.error('Error scraping La Centrale URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('La Centrale scraper completed', results);
    return {
      runId: null,
      totalScraped: results.totalScraped,
      saved: results.saved,
      processedUrls: results.processedUrls
    };
  } catch (error) {
    logger.error('Error in La Centrale scraper', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Scrape La Centrale page by page, calling onPageDone(listings, pageNum) after each.
 * Strategy: try scrape.do first (cheaper), fall back to Puppeteer if blocked.
 */
async function scrapeLaCentraleStreaming(baseUrl, maxPages, onPageDone) {
  let usePuppeteer = !isScrapeDoAvailable();
  let browser = null;
  const pageConcurrency = parseInt(process.env.LACENTRALE_CONCURRENT_PAGES || '2', 10) || 1;

  let sitePosition = 0;
  try {
    for (let start = 1; start <= maxPages; start += pageConcurrency) {
      const pageNums = [];
      for (let i = 0; i < pageConcurrency && start + i <= maxPages; i++) pageNums.push(start + i);

      let batchResults = [];
      if (!usePuppeteer) {
        batchResults = await Promise.all(pageNums.map(async (page) => {
          const pageUrl = buildPageUrl(baseUrl, page);
          try {
            // Try render:false first (cheaper), then render:true with longer wait for JS-heavy pages
            let html = await fetchViaScrapeDo(pageUrl, { render: false, geoCode: 'fr', superProxy: true });
            let listings = parseSearchPage(html);
            if (listings.length === 0 && html?.length > 500) {
              html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 5000, geoCode: 'fr', superProxy: true });
              listings = parseSearchPage(html);
            }
            return { page, listings };
          } catch (err) {
            logger.warn('La Centrale scrape.do failed', { page, error: err.message });
            return { page, listings: [] };
          }
        }));
      } else {
        if (!browser) browser = await launchBrowser();
        for (const page of pageNums) {
          const pageUrl = buildPageUrl(baseUrl, page);
          const listings = await scrapeLaCentralePagePuppeteer(browser, pageUrl);
          batchResults.push({ page, listings });
        }
      }

      for (const { page, listings } of batchResults) {
        if (listings.length === 0 && page === start) {
          logger.info('La Centrale no more listings found, stopping', { page });
          return;
        }
        if (listings.length === 0) continue;
        logger.info('La Centrale search page parsed', { page, found: listings.length });
        const enriched = await enrichListingsWithDetails(listings, usePuppeteer ? browser : null);
        enriched.forEach(l => { l.sitePosition = ++sitePosition; });
        await onPageDone(enriched, page);
      }
      if (batchResults[0]?.listings?.length === 0) break;
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    }
  } finally {
    if (browser) await browser.close();
  }
}

function buildPageUrl(baseUrl, page) {
  if (page === 1) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}page=${page}`;
}

// ─── Search page parsing ───

/**
 * Parse La Centrale search results from HTML.
 * Primary: extract __PRELOADED_STATE__ JSON (embedded SSR data).
 * Fallback: parse HTML cards with Cheerio.
 */
function parseSearchPage(html) {
  const fromJson = parsePreloadedState(html);
  if (fromJson.length > 0) return fromJson;
  return parseSearchPageHtml(html);
}

/**
 * Extract listings from __PRELOADED_STATE__ (legacy) or __NEXT_DATA__ (Next.js).
 * La Centrale may use either depending on their deployment.
 */
function parsePreloadedState(html) {
  const listings = [];

  // Try __NEXT_DATA__ first (standard Next.js JSON embedded in <script id="__NEXT_DATA__">)
  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([^<]+)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextJson = JSON.parse(nextDataMatch[1]);
      const pageProps = nextJson?.props?.pageProps || {};
      // Try multiple possible Next.js paths for search results
      const nextHits =
        pageProps?.searchResults?.hits ||
        pageProps?.results?.hits ||
        pageProps?.listings ||
        pageProps?.data?.hits ||
        pageProps?.search?.hits ||
        [];
      if (nextHits.length > 0) {
        return extractHitsToListings(nextHits);
      }
    } catch { /* fall through to __PRELOADED_STATE__ */ }
  }

  // Fallback: legacy __PRELOADED_STATE__ patterns
  const patterns = [
    /__PRELOADED_STATE__\s*=\s*({[\s\S]*?});\s*<\/script/,
    /__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/,
    /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/,
  ];

  let json = null;
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        json = JSON.parse(match[1]);
        break;
      } catch { /* try next pattern */ }
    }
  }

  if (!json) return [];

  const hits = json?.search?.hits || json?.searchResults?.hits || [];
  return extractHitsToListings(hits);
}

/**
 * Shared hit extraction logic for both __NEXT_DATA__ and __PRELOADED_STATE__.
 */
function extractHitsToListings(hits) {
  const listings = [];
  for (const hit of hits) {
    try {
      const item = hit?.item || hit;
      const vehicle = item?.vehicle || item;
      const ref = item?.reference || vehicle?.reference || null;
      if (!ref) continue;

      const url = buildListingUrl(ref);
      const loc = item?.location || {};
      const geopoints = loc?.geopoints || loc?.geopoint || {};

      listings.push({
        url,
        id: ref,
        brand: vehicle?.make || null,
        model: vehicle?.model || null,
        commercialName: vehicle?.commercialName || null,
        version: vehicle?.version || null,
        year: vehicle?.year || null,
        mileage: parseMileage(vehicle?.mileage),
        price: typeof item?.price === 'number' ? item.price : parseInt(String(item?.price).replace(/\D/g, ''), 10) || null,
        fuelType: vehicle?.energy || vehicle?.fuel || null,
        transmission: vehicle?.gearbox || null,
        powerDIN: vehicle?.powerDIN || null,
        fiscalPower: vehicle?.ratedHorsePower || vehicle?.fiscalPower || null,
        color: vehicle?.color || null,
        doors: vehicle?.doors || null,
        firstHand: vehicle?.firstHand || null,
        customerType: item?.customerType || null,
        locationCity: loc?.cityName || loc?.city || null,
        locationZipcode: loc?.zipCode || loc?.zipcode || null,
        locationRegion: loc?.regionName || loc?.region || null,
        locationDepartment: loc?.departmentName || loc?.department || null,
        locationLat: geopoints?.lat || null,
        locationLng: geopoints?.lon || geopoints?.lng || null,
        photoUrl: item?.photoUrl || null,
        goodDealBadge: item?.goodDealBadge || null,
        category: vehicle?.bodyType || vehicle?.body || null,
        family: vehicle?.family || null,
      });
    } catch (err) {
      logger.debug('La Centrale failed to parse hit', { error: err.message });
    }
  }
  return listings;
}

/**
 * Fallback HTML parsing when __PRELOADED_STATE__ is unavailable.
 */
function parseSearchPageHtml(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  const cardSelectors = [
    // URL-based selectors (most reliable)
    'a[href*="auto-occasion-annonce-"]',
    'a[href*="/auto-occasion-annonce"]',
    'a[href*="/annonce-voiture"]',
    'a[href*="/voiture-occasion"]',
    // Class-based selectors
    '[class*="searchCard"]',
    '[class*="SearchCard"]',
    '[class*="adCard"]',
    '[class*="AdCard"]',
    '[class*="listingCard"]',
    '[class*="ListingCard"]',
    '[class*="vehicleCard"]',
    '[class*="VehicleCard"]',
    '[class*="carCard"]',
    '[class*="CarCard"]',
    // Data attribute selectors
    '[data-testid*="listing"]',
    '[data-testid*="ad-card"]',
    '[data-testid*="vehicle"]',
    '[data-cy*="listing"]',
    // Semantic selectors
    'article[class*="result"]',
    'article[class*="card"]',
    'li[class*="result"]',
    'li[class*="listing"]',
  ];

  let cards = $();
  for (const sel of cardSelectors) {
    cards = $(sel);
    if (cards.length > 0) break;
  }

  cards.each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || $el.find('a[href*="annonce"]').first().attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
    const idMatch = fullUrl.match(/annonce-(\w+)\.html/) || fullUrl.match(/annonce-(\w+)/);
    if (!idMatch) return;
    const id = idMatch[1];
    if (seen.has(id)) return;
    seen.add(id);

    const card = $el.closest('[class*="card"], [class*="Card"], article').length
      ? $el.closest('[class*="card"], [class*="Card"], article')
      : $el;
    const text = card.text();

    const titleEl = card.find('h2, h3, [class*="title"], [class*="Title"]').first();
    const title = titleEl.text().trim() || $el.text().trim().substring(0, 120);

    const priceMatch = text.match(/(\d{1,3}(?:[\s.]\d{3})*)\s*€/);
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    const kmMatch = text.match(/([\d\s.]+)\s*km/i);

    const parts = title.split(/\s+/);

    listings.push({
      url: fullUrl,
      id,
      brand: parts[0] || null,
      model: parts.slice(1, 3).join(' ') || null,
      title,
      price: priceMatch ? parseInt(priceMatch[1].replace(/[\s.]/g, ''), 10) : null,
      year: yearMatch ? parseInt(yearMatch[0], 10) : null,
      mileage: kmMatch ? parseInt(kmMatch[1].replace(/[\s.]/g, ''), 10) : null,
    });
  });

  return listings;
}

/**
 * Build La Centrale listing URL from reference.
 * Reference codes: W→87, E→69, B→66 prefix mapping.
 */
function buildListingUrl(ref) {
  if (!ref) return null;
  const prefixMap = { W: '87', E: '69', B: '66' };
  const firstChar = ref[0];
  const numericId = prefixMap[firstChar]
    ? prefixMap[firstChar] + ref.substring(1)
    : ref;
  return `${BASE_URL}/auto-occasion-annonce-${numericId}.html`;
}

// ─── Puppeteer fallback for search page ───

async function scrapeLaCentralePagePuppeteer(browser, pageUrl) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.lacentrale.fr/'
    });

    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    if (await isPageBlocked(page)) {
      logger.warn('La Centrale Puppeteer page blocked', { url: pageUrl });
      return [];
    }

    const html = await page.content();
    const fromJson = parsePreloadedState(html);
    if (fromJson.length > 0) return fromJson;

    return await page.evaluate((baseUrl) => {
      const items = [];
      const seen = new Set();

      const links = document.querySelectorAll(
        'a[href*="auto-occasion-annonce-"], a[href*="/annonce-voiture"], a[href*="/voiture-occasion"]'
      );
      links.forEach(a => {
        const href = a.href || a.getAttribute('href');
        if (!href) return;
        const idMatch = href.match(/annonce-(\w+)\.html/) || href.match(/annonce-(\w+)/) || href.match(/voiture[^/]*-(\d{5,})/i);
        if (!idMatch || seen.has(idMatch[1])) return;
        seen.add(idMatch[1]);

        const card = a.closest('[class*="card"], [class*="Card"], article') || a;
        const text = card.textContent || '';
        const titleEl = card.querySelector('h2, h3, [class*="title"]');
        const title = titleEl?.textContent?.trim() || '';

        const priceMatch = text.match(/(\d{1,3}(?:[\s.]\d{3})*)\s*€/);
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        const kmMatch = text.match(/([\d\s.]+)\s*km/i);

        const parts = title.split(/\s+/);
        items.push({
          url: href.startsWith('http') ? href : `${baseUrl}${href}`,
          id: idMatch[1],
          brand: parts[0] || null,
          model: parts.slice(1, 3).join(' ') || null,
          title,
          price: priceMatch ? parseInt(priceMatch[1].replace(/[\s.]/g, ''), 10) : null,
          year: yearMatch ? parseInt(yearMatch[0], 10) : null,
          mileage: kmMatch ? parseInt(kmMatch[1].replace(/[\s.]/g, ''), 10) : null,
        });
      });

      return items;
    }, BASE_URL);
  } finally {
    await page.close();
  }
}

// ─── Detail page enrichment ───

async function enrichListingsWithDetails(listings, browser) {
  const concurrency = parseInt(process.env.LACENTRALE_CONCURRENT_DETAILS || '5', 10) || 1;
  const enriched = [];
  for (let i = 0; i < listings.length; i += concurrency) {
    const chunk = listings.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(async (item) => {
      try {
        const details = await fetchListingDetails(item.url, browser);
        return details ? { ...item, ...details } : item;
      } catch (err) {
        logger.warn('La Centrale detail fetch failed', { url: item.url, error: err.message });
        return item;
      }
    }));
    enriched.push(...chunkResults);
    await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
  }
  return enriched;
}

/**
 * Fetch and parse a La Centrale detail page.
 * Extracts fragment_tracking_state JSON + structured HTML data.
 */
async function fetchListingDetails(listingUrl, browser) {
  if (!listingUrl) return null;

  let html;
  if (isScrapeDoAvailable() && !browser) {
    // Try cheap render=false first; fall back to render=true if specs (color, doors) are missing.
    // fragment_tracking_state (which carries color/doors) requires JS rendering — don't skip render=true
    // just because price/jsonBrand/fullTitle are present from static JSON-LD.
    html = await fetchViaScrapeDo(listingUrl, { render: false, geoCode: 'fr', superProxy: true });
    const quickParse = parseDetailPage(html);
    const hasBasicData = quickParse?.price || quickParse?.jsonBrand || quickParse?.fullTitle;
    const hasSpecs = quickParse?.color != null && quickParse?.doors != null;
    if (!hasBasicData || !hasSpecs) {
      html = await fetchViaScrapeDo(listingUrl, { render: true, customWait: 4000, geoCode: 'fr', superProxy: true });
    } else {
      return quickParse;
    }
  } else if (browser) {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      html = await page.content();
    } finally {
      await page.close();
    }
  } else {
    // scrape.do not available, not browser — same render=false-first logic
    html = await fetchViaScrapeDo(listingUrl, { render: false, geoCode: 'fr', superProxy: true });
    const quickParse = parseDetailPage(html);
    const hasBasicData = quickParse?.price || quickParse?.jsonBrand || quickParse?.fullTitle;
    const hasSpecs = quickParse?.color != null && quickParse?.doors != null;
    if (!hasBasicData || !hasSpecs) {
      html = await fetchViaScrapeDo(listingUrl, { render: true, customWait: 4000, geoCode: 'fr', superProxy: true });
    } else {
      return quickParse;
    }
  }

  return parseDetailPage(html);
}

function parseDetailPage(html) {
  const $ = cheerio.load(html);
  const data = {};

  // 1. fragment_tracking_state JSON (richest detail source)
  $('script').each((_, el) => {
    const text = $(el).html() || '';
    if (!text.includes('fragment_tracking_state')) return;
    const match = text.match(/fragment_tracking_state\s*=\s*({[\s\S]*?});/);
    if (!match) return;
    try {
      const json = JSON.parse(match[1]);
      const v = json?.vehicle || {};
      if (v.energy) data.fuelType = v.energy;
      if (v.powerDIN) data.powerDIN = v.powerDIN;
      if (v.ratedHorsePower) data.fiscalPower = v.ratedHorsePower;
      if (v.gearbox) data.transmission = v.gearbox;
      if (v.color) data.color = v.color;
      if (v.doors) data.doors = parseInt(v.doors, 10) || null;
      if (v.firstHand != null) data.firstHand = v.firstHand;
      if (v.options) data.optionsCount = Array.isArray(v.options) ? v.options.length : 0;
      if (v.bodyType || v.body) data.category = v.bodyType || v.body;
      if (v.make) data.jsonBrand = v.make;
      if (v.model) data.jsonModel = v.model;
      if (v.version) data.version = v.version;
      if (v.year) data.jsonYear = v.year;
      if (v.mileage) data.jsonMileage = parseMileage(v.mileage);
      if (v.displacement || v.engineSize) {
        const d = parseFloat(String(v.displacement || v.engineSize).replace(',', '.'));
        if (!isNaN(d)) data.displacement = d > 100 ? d / 1000 : d;
      }
    } catch { /* ignore */ }
  });

  // 2. __PRELOADED_STATE__ on detail page
  const preloadPatterns = [
    /__PRELOADED_STATE__\s*=\s*({[\s\S]*?});\s*<\/script/,
    /__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/,
  ];
  for (const pattern of preloadPatterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      const json = JSON.parse(match[1]);
      const ad = json?.classified || json?.ad || json?.listing || {};
      const v = ad?.vehicle || {};
      if (v.make && !data.jsonBrand) data.jsonBrand = v.make;
      if (v.model && !data.jsonModel) data.jsonModel = v.model;
      if (v.version && !data.version) data.version = v.version;
      if (ad.price && !data.price) data.price = typeof ad.price === 'number' ? ad.price : parseInt(String(ad.price).replace(/\D/g, ''), 10);
      if (ad.photos) data.images = ad.photos.map(p => p.url || p.uri || p).filter(Boolean);
      break;
    } catch { /* ignore */ }
  }

  // 3. JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      if (!['Vehicle', 'Car', 'Product'].includes(json['@type'])) return;
      if (json.image && !data.images) {
        data.images = (Array.isArray(json.image) ? json.image : [json.image])
          .map(img => typeof img === 'string' ? img : img.contentUrl || img.url || '')
          .filter(Boolean);
      }
      if (json.name) data.fullTitle = data.fullTitle || json.name;
      if (json.description) data.description = json.description;
      if (json.brand) data.jsonBrand = data.jsonBrand || (typeof json.brand === 'object' ? json.brand.name : json.brand);
      if (json.model) data.jsonModel = data.jsonModel || json.model;
      if (json.offers?.price) data.price = data.price || parseFloat(json.offers.price);
      if (json.offers?.seller?.['@type'] === 'Organization') data.sellerType = 'professional';
    } catch { /* ignore */ }
  });

  // 4. Fallback images from meta/img tags
  if (!data.images || data.images.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) data.images = [ogImg];
  }
  if (!data.images || data.images.length === 0) {
    const images = [];
    const skipPatterns = /logo|favicon|sprite|icon|banner|placeholder|default|header|footer|nav/i;
    $('[class*="gallery"] img, [class*="carousel"] img, [class*="slider"] img, [class*="photo"] img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src') || '';
      if (src && src.length > 30 && !skipPatterns.test(src)) images.push(src.split('?')[0]);
    });
    if (images.length > 0) data.images = [...new Set(images)];
  }

  // 5. Title
  const h1 = $('h1').first().text().trim();
  if (h1) data.fullTitle = data.fullTitle || h1;

  // 6. Description
  const descEl = $('[class*="description"], [itemprop="description"]').first().text().trim();
  if (descEl && descEl.length > 10) data.description = data.description || descEl;

  // 7. Specs from HTML tables/lists
  const specs = {};
  $('li, tr, [class*="spec"], [class*="caract"], [class*="detail"]').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.includes('kilométrage') || text.includes('kilometrage')) {
      const m = text.match(/([\d\s.]+)\s*km/i);
      if (m) specs['kilometrage'] = m[1].replace(/[\s.]/g, '');
    }
    if (text.includes('année') || text.includes('mise en circulation')) {
      const m = text.match(/\b(19|20)\d{2}\b/);
      if (m) specs['annee'] = m[0];
    }
    if (text.includes('énergie') || text.includes('carburant')) {
      const m = text.match(/(essence|diesel|[ée]lectrique|hybride|gpl)/i);
      if (m) specs['energie'] = m[1];
    }
    if ((text.includes('boîte') || text.includes('boite') || text.includes('transmission'))) {
      if (/automatique|auto|dsg|tiptronic|bva|robot/i.test(text)) specs['transmission'] = 'automatique';
      else if (/manuelle|bvm/i.test(text)) specs['transmission'] = 'manuelle';
    }
    if (text.includes('couleur')) {
      const m = text.match(/couleur\s*:?\s*(.+)/i);
      if (m) specs['couleur'] = m[1].trim();
    }
    if (text.includes('portes')) {
      const m = text.match(/(\d)\s*portes?/i);
      if (m) specs['portes'] = m[1];
    }
    if (text.includes('puissance din') || text.includes('puissance :')) {
      const m = text.match(/(\d{2,4})\s*(?:ch|cv)/i);
      if (m) specs['puissance'] = m[1];
    }
  });
  data.specifications = specs;

  return data;
}

// ─── Helpers ───

function parseMileage(val) {
  if (!val) return null;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[\s.km]/gi, '');
  return parseInt(cleaned, 10) || null;
}

// ─── French location helpers (map imported from locationUtils) ───

// ─── Mapping constants ───

const FUEL_MAP = {
  essence: 'petrol', diesel: 'diesel', 'électrique': 'electric', electrique: 'electric',
  hybride: 'hybrid', 'hybride rechargeable': 'plug-in hybrid', 'plug-in hybride': 'plug-in hybrid',
  gpl: 'lpg', gnv: 'cng', 'hydrogène': 'hydrogen', bioéthanol: 'ethanol',
};

const TRANSMISSION_MAP = {
  automatique: 'automatic', manuelle: 'manual', 'séquentielle': 'sequential',
  auto: 'automatic', manual: 'manual',
};

const CATEGORY_MAP = {
  berline: 'sedan', break: 'estate', cabriolet: 'convertible',
  citadine: 'hatchback', 'coupé': 'coupe', coupe: 'coupe',
  monospace: 'mpv', suv: 'suv', '4x4': 'suv',
  utilitaire: 'van', 'pick-up': 'pickup', fourgon: 'van',
  'mini citadine': 'hatchback', compact: 'hatchback', familiale: 'estate',
  sedan: 'sedan',
};

const DOOR_MAP = {
  sedan: 4, hatchback: 5, estate: 5, suv: 5,
  coupe: 2, convertible: 2, mpv: 5, pickup: 4, van: 4,
};

const KNOWN_TRIMS = new Set([
  'inscription', 'momentum', 'r-design', 'summum', 'kinetic', 'ocean', 'core', 'pure', 'plus', 'ultra',
  'titanium', 'vignale', 'st-line', 'trend', 'active', 'st',
  'r-line', 'highline', 'comfortline', 'trendline', 'life', 'elegance', 'style',
  'ambition', 'ambiente', 'business', 'premium', 'pro', 's line', 's-line',
  'sport', 'luxury', 'executive', 'edition', 'ultimate', 'gt', 'gt-line', 'gt line',
  'tekna', 'acenta', 'n-connecta', 'visia',
  'allure', 'feel', 'shine', 'flair',
  'amg', 'amg line', 'avantgarde', 'progressive', 'exclusive',
  'advance', 'se', 'sel', 'limited', 'platinum',
  'xcellence', 'desire', 'reference', 'motion',
  'first edition', 'launch edition', 'base',
  'm sport', 'm-sport', 'xline', 'x-line', 'luxury line', 'sport line',
  'zen', 'intens', 'initiale paris', 'iconic', 'techno', 'evolution', 'equilibre',
  'confort', 'dynamique', 'privilege', 'intense', 'riviera', 'rivoli',
]);

// ─── Data mapping to listing schema ───

/**
 * Map La Centrale scraper data to our database listing schema.
 */
export function mapLaCentraleDataToListing(item) {
  const sourceListingId = item.id || item.reference || extractIdFromUrl(item.url);

  // Price
  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price.amount || item.price.value || 0;
  } else if (typeof item.price === 'string') {
    priceValue = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
  } else {
    priceValue = item.price || 0;
  }
  const price = parseFloat(priceValue) || 0;

  // Mileage
  let mileage = item.jsonMileage || 0;
  if (!mileage) {
    const specs = item.specifications || {};
    const kmRaw = specs['kilometrage'] || '';
    mileage = parseInt(String(kmRaw).replace(/[\s.km]/gi, ''), 10) || 0;
  }
  if (!mileage) mileage = parseMileage(item.mileage) || 0;

  // Year
  let year = item.jsonYear || null;
  if (!year) {
    const specs = item.specifications || {};
    const yearRaw = specs['annee'] || '';
    const m = yearRaw.match(/\b(19|20)\d{2}\b/);
    year = m ? parseInt(m[0], 10) : null;
  }
  if (!year) year = parseInt(item.year, 10) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  // Brand & model
  const brand = (item.jsonBrand || item.brand || '').toLowerCase() || null;
  const model = (item.jsonModel || item.model || item.commercialName || '').toLowerCase() || null;

  // Fuel type
  const fuelRaw = (item.fuelType || item.specifications?.energie || '').toLowerCase();
  const fuelType = FUEL_MAP[fuelRaw] || fuelRaw || null;

  // Transmission
  const transRaw = (item.transmission || item.specifications?.transmission || '').toLowerCase();
  const transmission = TRANSMISSION_MAP[transRaw] || (transRaw.includes('auto') ? 'automatic' : transRaw.includes('manu') ? 'manual' : transRaw || null);

  // Power
  const powerHp = parseInt(item.powerDIN || item.specifications?.puissance, 10) || null;

  // Location
  let locationCity = item.locationCity || null;
  let locationRegion = item.locationRegion || null;
  const locationLat = item.locationLat || null;
  const locationLng = item.locationLng || null;

  if (!locationRegion && item.locationZipcode) {
    const dept = item.locationZipcode.startsWith('97')
      ? item.locationZipcode.substring(0, 3)
      : item.locationZipcode.substring(0, 2);
    locationRegion = FRENCH_DEPT_TO_REGION[dept] || null;
  }
  if (!locationRegion && item.locationDepartment) {
    locationRegion = item.locationDepartment;
  }
  if (!locationRegion) locationRegion = 'France';

  // Seller type
  const sellerType = item.sellerType || (item.customerType === 'PRO' ? 'professional' : 'private');

  // Category
  const catRaw = (item.category || '').toLowerCase();
  const category = CATEGORY_MAP[catRaw] || catRaw || null;

  // Doors
  const doors = parseInt(item.doors || item.specifications?.portes, 10) || (category ? DOOR_MAP[category] || null : null);

  // Color
  const color = item.color || item.specifications?.couleur || null;

  // Displacement
  let displacement = item.displacement || null;
  if (!displacement && item.specifications?.cylindree) {
    const n = parseFloat(String(item.specifications.cylindree).replace(',', '.').replace(/[^\d.]/g, ''));
    if (!isNaN(n)) displacement = n > 100 ? n / 1000 : n;
  }

  // Version / trim
  const { version, trim } = extractVersionTrim(
    item.version || item.fullTitle || item.title || '',
    item.specifications || {}
  );

  // Images
  let images = Array.isArray(item.images) ? item.images : [];
  if (images.length === 0 && item.photoUrl) {
    images = [item.photoUrl];
  }

  return {
    source_platform: SOURCE_PLATFORM,
    source_listing_id: String(sourceListingId),
    brand,
    model,
    year,
    mileage,
    price,
    currency: 'EUR',
    location_city: locationCity,
    location_region: locationRegion,
    location_country: 'FR',
    location_latitude: locationLat,
    location_longitude: locationLng,
    seller_type: sellerType,
    url: item.url || null,
    images,
    specifications: item.specifications || {},
    description: item.description || null,
    posted_date: null,
    fuel_type: fuelType,
    transmission,
    steering: 'LHD',
    color,
    doors,
    power_hp: powerHp,
    displacement,
    version,
    trim,
    category,
    drivetrain: null,
  };
}

function extractIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/annonce-(\w+)\.html/) || url.match(/annonce-(\w+)/);
  return match ? match[1] : url;
}

function extractVersionTrim(text, specs) {
  let trim = null;
  let version = null;

  const textLower = (text || '').toLowerCase();
  const sortedTrims = [...KNOWN_TRIMS].sort((a, b) => b.length - a.length);
  for (const t of sortedTrims) {
    if (textLower.includes(t)) {
      trim = t;
      break;
    }
  }

  const versionMatch = textLower.match(/\b(4motion|4matic|xdrive|quattro|e-hybrid|plug-in|awd|4x4)\b/i);
  if (versionMatch) version = versionMatch[1];

  const specVersion = specs['version'] || specs['finition'] || null;
  if (specVersion && !trim) trim = specVersion;
  if (!version && text && !trim) version = text;

  return { version, trim };
}
