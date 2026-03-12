import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo, isScrapeDoAvailable, isPageBlocked } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import { launchBrowser } from '../utils/puppeteerLaunch.js';

const SOURCE_PLATFORM = 'finn';
const BASE_URL = 'https://www.finn.no';

/**
 * Run FINN.no scraper (Norway's largest marketplace - Schibsted/Vend)
 * Flux: scrape → raw_listings → processRawListings → listings
 * Uses Puppeteer primary, scrape.do fallback (geoCode: no)
 */
export async function runFinnScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = {
    totalScraped: 0,
    saved: 0,
    errors: 0,
    processedUrls: []
  };

  try {
    const maxPages = options.maxPages || 10;

    if (isScrapeDoAvailable()) {
      logger.info('Starting FINN.no scraper (scrape.do first)', { searchUrls, options });
      const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];
      for (const searchUrl of urls) {
        try {
          let sitePosition = 0;
          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const pageUrl = buildPageUrl(searchUrl, pageNum);
            let html;
            try {
              html = await fetchViaScrapeDo(pageUrl, { render: false, geoCode: 'no' });
              if (parseFinnSearchPage(html).length === 0 && html?.length > 500) {
                html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 4000, geoCode: 'no' });
              }
            } catch (err) {
              logger.warn('FINN scrape.do failed', { page: pageNum, error: err.message });
              break;
            }
            const pageListings = parseFinnSearchPage(html);
            if (pageListings.length === 0) break;
            const enriched = [];
            for (const item of pageListings) {
              try {
                const details = await fetchFinnDetailViaScraper(item.url);
                enriched.push(details ? { ...item, ...details } : item);
              } catch { enriched.push(item); }
              await new Promise(r => setTimeout(r, 500));
            }
            enriched.forEach(l => { l.sitePosition = ++sitePosition; });
            await saveRawListings(enriched, SOURCE_PLATFORM);
            const processResult = await processRawListings({ limit: enriched.length + 100, sourcePlatform: SOURCE_PLATFORM });
            results.totalScraped += enriched.length;
            results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);
            if (progressCallback) await progressCallback({ totalScraped: results.totalScraped, totalSaved: results.saved, status: 'RUNNING', processedUrls: results.processedUrls });
            await new Promise(r => setTimeout(r, 1500));
          }
          results.processedUrls.push(searchUrl);
        } catch (err) {
          logger.error('Error scraping FINN URL', { url: searchUrl, error: err.message });
          results.errors++;
        }
      }
      return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
    }

    logger.info('Starting FINN.no scraper', { searchUrls, options });

    browser = await launchBrowser();

    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping FINN.no URL', { url: searchUrl });

        await scrapeFinnUrlStreaming(browser, searchUrl, maxPages, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          await saveRawListings(pageListings, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: pageListings.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += pageListings.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('FINN.no batch saved', {
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
        logger.error('Error scraping FINN.no URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('FINN.no scraper completed', results);
    return {
      runId: null,
      totalScraped: results.totalScraped,
      saved: results.saved,
      processedUrls: results.processedUrls
    };
  } catch (error) {
    logger.error('Error in FINN.no scraper', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape FINN.no page-by-page, with scrape.do fallback when blocked
 */
async function scrapeFinnUrlStreaming(browser, url, maxPages, onPageDone) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': `${BASE_URL}/`
    });

    let currentPage = 1;
    let sitePosition = 0;

    while (currentPage <= maxPages) {
      const pageUrl = buildPageUrl(url, currentPage);

      logger.info('FINN.no fetching search page', { page: currentPage, url: pageUrl });

      let html;
      let usedFallback = false;

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));

        if (await isPageBlocked(page)) {
          logger.warn('FINN.no page blocked, falling back to scrape.do', { page: currentPage });
          html = await fetchViaScrapeDo(pageUrl, { render: false, geoCode: 'no' });
          if (parseFinnSearchPage(html).length === 0 && html?.length > 500) {
            html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 4000, geoCode: 'no' });
          }
          usedFallback = true;
        } else {
          html = await page.content();
        }
      } catch (err) {
        logger.warn('FINN.no Puppeteer failed, trying scrape.do', { page: currentPage, error: err.message });
        try {
          html = await fetchViaScrapeDo(pageUrl, { render: false, geoCode: 'no' });
          if (parseFinnSearchPage(html).length === 0 && html?.length > 500) {
            html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 4000, geoCode: 'no' });
          }
          usedFallback = true;
        } catch (fallbackErr) {
          logger.error('FINN.no search page fetch failed', { page: currentPage, error: fallbackErr.message });
          break;
        }
      }

      const pageListings = parseFinnSearchPage(html);
      if (pageListings.length === 0) {
        logger.info('FINN.no no more listings found, stopping', { page: currentPage });
        break;
      }

      logger.info('FINN.no search page parsed', { page: currentPage, found: pageListings.length, usedFallback });

      // Enrich with detail pages
      const enriched = [];
      const detailBrowser = usedFallback ? null : browser;
      for (const item of pageListings) {
        try {
          const details = detailBrowser
            ? await fetchFinnListingDetails(detailBrowser, item.url)
            : (isScrapeDoAvailable() ? await fetchFinnDetailViaScraper(item.url) : null);
          enriched.push(details ? { ...item, ...details } : item);
        } catch (e) {
          enriched.push(item);
        }
      }

      enriched.forEach(l => { l.sitePosition = ++sitePosition; });
      await onPageDone(enriched, currentPage);
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      currentPage++;
    }
  } finally {
    await page.close();
  }
}

function buildPageUrl(baseUrl, pageNum) {
  if (pageNum === 1) return baseUrl;
  const url = new URL(baseUrl);
  url.searchParams.set('page', String(pageNum));
  return url.toString();
}

/**
 * Parse FINN.no search results. Supports both Schibsted-style cards and generic structure.
 * FINN uses: a[href*="finnkode"] or a[href*="/mobility/car/ad"]
 * Specs line: "2016 ∙ 123 800 km ∙ Bensin ∙ Automat" (year ∙ mileage km ∙ fuel ∙ transmission)
 */
function parseFinnSearchPage(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  const linkSelectors = [
    'a[href*="finnkode="]',
    'a[href*="/mobility/car/ad"]',
    'a.sf-search-ad-link[href*="/mobility/"]'
  ];

  let links = $();
  for (const sel of linkSelectors) {
    links = links.add($(sel));
  }

  links.each((_, a) => {
    const href = $(a).attr('href');
    if (!href) return;

    const finnMatch = href.match(/finnkode=(\d+)/);
    const idMatch = href.match(/\/ad\/(\d+)/) || href.match(/(\d{6,})/);
    const sourceListingId = finnMatch ? finnMatch[1] : (idMatch ? idMatch[1] : null);
    if (!sourceListingId || seen.has(sourceListingId)) return;
    seen.add(sourceListingId);

    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? href : '/' + href}`;

    const card = $(a).closest('[class*="search-ad-card"], [class*="result-card"], article, .ads__unit').first() || $(a).closest('div').first();
    const text = (card.length ? card : $(a)).text().replace(/\s+/g, ' ');
    const title = card.find('h2, h3, [class*="title"]').first().text().trim() || $(a).text().trim();

    // Price: "189 000 kr" or "649 995 kr"
    const priceMatch = text.match(/([\d\s\u00a0]+)\s*kr\b/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/[\s\u00a0]/g, ''), 10) : null;

    // Specs: "2016 ∙ 123 800 km ∙ Bensin ∙ Automat" or "2022 ∙ 63 574 km ∙ El ∙ 456 km rekkevidde"
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

    const kmMatch = text.match(/([\d\s\u00a0]+)\s*km\b/);
    const mileage = kmMatch ? parseInt(kmMatch[1].replace(/[\s\u00a0]/g, ''), 10) : null;

    // Fuel: Bensin, Diesel, El, Hybrid bensin, Plug-in Bensin, etc.
    let fuelType = null;
    if (/\bEl\b|\belektrisk\b/i.test(text)) fuelType = 'electric';
    else if (/\bDiesel\b/i.test(text)) fuelType = 'diesel';
    else if (/\bBensin\b|\bPetrol\b/i.test(text)) fuelType = 'petrol';
    else if (/\bHybrid\b/i.test(text) || /\bPlug-in\b/i.test(text)) fuelType = 'hybrid';

    // Transmission: Automat, Manuell
    let transmission = null;
    if (/\bAutomat\b/i.test(text)) transmission = 'automatic';
    else if (/\bManuell\b/i.test(text)) transmission = 'manual';

    const titleParts = (title || '').split(/\s+/);
    const brand = titleParts[0] || null;
    const model = titleParts.slice(1, 4).join(' ') || null;

    // Location: typically city name before "Privat" or "Merkeforhandler"
    const locMatch = text.match(/([A-Za-zÆØÅæøå][A-Za-zÆØÅæøå\s\-]+?)(?:\s*(?:Privat|Merkeforhandler|Forhandler|Smidig))/);
    const locationCity = locMatch ? locMatch[1].trim() : null;

    const img = card.find('img').first();
    const image = img.attr('src') || img.attr('data-src');

    listings.push({
      url: fullUrl,
      id: sourceListingId,
      brand,
      model,
      title,
      price,
      year,
      mileage,
      fuelType,
      transmission,
      locationCity,
      image: image || null
    });
  });

  return listings;
}

/**
 * Fetch FINN.no listing detail via Puppeteer
 */
async function fetchFinnListingDetails(browser, listingUrl) {
  const page = await browser.newPage();
  try {
    await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    if (await isPageBlocked(page)) {
      await page.close();
      return fetchFinnDetailViaScraper(listingUrl);
    }

    const details = await page.evaluate(() => {
      const data = {};

      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of jsonLdScripts) {
        try {
          const json = JSON.parse(s.textContent);
          if (json['@type'] === 'Product') {
            if (Array.isArray(json.image)) {
              data.images = json.image.map(img =>
                typeof img === 'string' ? img : img.contentUrl || img.url || ''
              ).filter(Boolean);
            }
            data.sellerType = json.offers?.seller?.['@type'] === 'Organization' ? 'professional' : 'private';
          }
        } catch { /* ignore */ }
      }

      if (!data.images?.length) {
        const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImg) data.images = [ogImg];
      }

      const specs = {};
      document.querySelectorAll('dl dt, .key-info dt, [class*="spec"] dt').forEach(dt => {
        const dd = dt.nextElementSibling;
        const label = (dt.textContent || '').trim().toLowerCase();
        const value = dd?.textContent?.trim();
        if (label && value) specs[label.replace(/[^\w\sæøå]/gi, '')] = value;
      });

      const headings = document.querySelectorAll('h2, h3');
      headings.forEach(h => {
        const text = (h.textContent || '').trim();
        if (text === 'Beskrivelse' || text === 'Om bilen') {
          const next = h.nextElementSibling;
          const t = next?.textContent?.trim();
          if (t && t.length > 10) data.description = t;
        }
        if (text === 'Plassering' || text === 'Lokasjon') {
          const next = h.nextElementSibling;
          const t = next?.textContent?.trim();
          if (t && t.length > 2) data.location = t;
        }
      });

      return { ...data, specifications: specs };
    });

    return details;
  } catch (error) {
    logger.warn('Puppeteer failed for FINN detail, trying scrape.do', { url: listingUrl, error: error.message });
    await page.close();
    return fetchFinnDetailViaScraper(listingUrl);
  }
}

async function fetchFinnDetailViaScraper(listingUrl) {
  if (!isScrapeDoAvailable()) return null;
  try {
    const html = await fetchViaScrapeDo(listingUrl, { render: true, customWait: 3000, geoCode: 'no' });
    const $ = cheerio.load(html);
    const data = {};

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json['@type'] === 'Product') {
          if (Array.isArray(json.image)) {
            data.images = json.image.map(img => typeof img === 'string' ? img : img.contentUrl || img.url || '').filter(Boolean);
          }
          data.sellerType = json.offers?.seller?.['@type'] === 'Organization' ? 'professional' : 'private';
        }
      } catch { /* ignore */ }
    });

    if (!data.images?.length) {
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (ogImg) data.images = [ogImg];
    }

    const specs = {};
    $('dl dt, .key-info dt, [class*="spec"] dt').each((_, dt) => {
      const dd = $(dt).next('dd');
      const label = $(dt).text().replace(/[^\w\sæøå]/gi, '').trim().toLowerCase();
      const value = dd.text().trim();
      if (label && value) specs[label] = value;
    });

    $('h2, h3').each((_, h) => {
      const text = $(h).text().trim();
      if (text === 'Beskrivelse' || text === 'Om bilen') {
        const t = $(h).next().text().trim();
        if (t && t.length > 10) data.description = t;
      }
      if (text === 'Plassering' || text === 'Lokasjon') {
        const t = $(h).next().text().trim();
        if (t && t.length > 2) data.location = t;
      }
    });

    return { ...data, specifications: specs };
  } catch (err) {
    logger.warn('scrape.do fallback failed for FINN detail', { url: listingUrl, error: err.message });
    return null;
  }
}

/**
 * Map FINN.no data to listings schema
 */
export function mapFinnDataToListing(item) {
  const urlMatch =
    item.url?.match(/finnkode=(\d+)/) ||
    item.url?.match(/\/ad\/(\d+)/) ||
    item.url?.match(/(\d{6,})/);
  const sourceListingId = urlMatch ? urlMatch[1] : (item.id ? String(item.id) : item.url);

  const specs = item.specifications || {};

  let price = 0;
  if (typeof item.price === 'number') price = item.price;
  else if (typeof item.price === 'string') price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
  else price = item.price || 0;

  // Mileage: FINN uses km directly (not mil like Sweden)
  let mileage = parseInt(item.mileage, 10) || 0;
  const milSpec = specs['kilometerstand'] || specs['km'] || specs['miltal'];
  if (!mileage && milSpec) {
    mileage = parseInt(String(milSpec).replace(/[\s]/g, ''), 10) || 0;
  }

  let year = item.year || specs['årsmodell'] || specs['modellår'] || specs['år'];
  if (typeof year === 'string') {
    const m = year.match(/\b(19|20)\d{2}\b/);
    year = m ? parseInt(m[0], 10) : parseInt(year, 10);
  }
  year = parseInt(year) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  const titleParts = (item.title || '').split(/\s+/);
  const brand = specs['merke'] || item.brand || titleParts[0] || null;
  const model = specs['modell'] || item.model || titleParts.slice(1, 4).join(' ') || null;

  const fuelRaw = (item.fuelType || specs['drivstoff'] || specs['drivmedel'] || '').toLowerCase();
  const fuelType = normalizeFuelType(fuelRaw);

  const transRaw = (item.transmission || specs['girkasse'] || specs['växellåda'] || '').toLowerCase();
  const transmission = normalizeTransmission(transRaw);

  const powerRaw = specs['hestekrefter'] || specs['effekt'] || specs['hk'];
  const powerHp = powerRaw ? parseInt(String(powerRaw).replace(/[^\d]/g, ''), 10) || null : null;

  const locationStr = item.location || specs['plassering'] || '';
  const { city: locationCity, region: locationRegion } = parseNorwegianAddress(locationStr);

  const sellerType = item.sellerType === 'professional' || item.sellerType === 'dealer'
    ? 'professional'
    : 'private';

  return {
    source_platform: SOURCE_PLATFORM,
    source_listing_id: String(sourceListingId),
    brand: normalizeBrand(brand),
    model: normalizeModel(model),
    year,
    mileage,
    price,
    currency: 'NOK',
    location_city: locationCity || item.locationCity,
    location_region: locationRegion,
    location_country: 'NO',
    seller_type: sellerType,
    url: item.url || null,
    images: (item.images && item.images.length > 0) ? item.images : (item.image ? [item.image] : []),
    specifications: specs,
    description: item.description || null,
    posted_date: null,
    fuel_type: fuelType,
    transmission,
    steering: 'LHD',
    color: specs['farge'] || specs['färg'] || null,
    doors: parseInt(specs['antall dører'] || specs['dører'], 10) || null,
    power_hp: powerHp,
    displacement: (() => {
      const v = specs['motorvolum'] || specs['cylindervolym'];
      if (v == null) return null;
      const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.]/g, ''));
      return Number.isNaN(n) ? null : (n > 100 ? n / 1000 : n);
    })(),
    version: null,
    trim: null,
    category: normalizeCategory(specs['karosseri'] || ''),
    drivetrain: normalizeDrivetrain(specs['hjuldrift'] || specs['drivhjul'] || '')
  };
}

function normalizeFuelType(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  const map = {
    'bensin': 'petrol', 'diesel': 'diesel', 'el': 'electric', 'elektrisk': 'electric',
    'hybrid bensin': 'hybrid', 'hybrid diesel': 'hybrid', 'plug-in bensin': 'plug-in hybrid',
    'plug-in diesel': 'plug-in hybrid', 'gass': 'lpg', 'hydrogen': 'hydrogen'
  };
  for (const [k, val] of Object.entries(map)) {
    if (v.includes(k)) return val;
  }
  return v || null;
}

function normalizeTransmission(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (v.includes('automat') || v.includes('auto')) return 'automatic';
  if (v.includes('manuell') || v.includes('man')) return 'manual';
  return v || null;
}

function normalizeDrivetrain(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (/\b(4wd|4x4|awd|4matic|quattro|xdrive|4motion|firehjul)\b/.test(v)) return 'awd';
  if (/\b(fwd|forhjul|forhjulsdrift)\b/.test(v)) return 'fwd';
  if (/\b(rwd|bakhjul|bakhjulsdrift)\b/.test(v)) return 'rwd';
  return null;
}

function normalizeCategory(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase();
  const map = {
    'suv': 'suv', 'offroad': 'suv', 'kombi': 'estate', 'stasjonsvogn': 'estate',
    'sedan': 'sedan', 'flerbruksbil': 'mpv', 'hatchback': 'hatchback',
    'coupé': 'coupe', 'cabriolet': 'convertible', 'varebil': 'van'
  };
  for (const [k, val] of Object.entries(map)) {
    if (v.includes(k)) return val;
  }
  return v || null;
}

function normalizeBrand(brand) {
  if (!brand) return null;
  const map = {
    'mercedes': 'Mercedes-Benz', 'mercedes-benz': 'Mercedes-Benz',
    'mb': 'Mercedes-Benz', 'bmw': 'BMW', 'vw': 'Volkswagen',
    'volvo': 'Volvo', 'mini': 'MINI', 'ds': 'DS Automobiles'
  };
  const lower = brand.toLowerCase().trim();
  return map[lower] || brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
}

function normalizeModel(model) {
  if (!model) return null;
  return model.trim();
}

function parseNorwegianAddress(str) {
  if (!str || typeof str !== 'string') return { city: null, region: null };
  const parts = str.split(/[,\s]+/).filter(Boolean);
  if (parts.length === 0) return { city: null, region: null };
  const city = parts[0] || null;
  const region = parts.length > 1 ? parts.slice(1).join(' ') : null;
  return { city, region };
}
