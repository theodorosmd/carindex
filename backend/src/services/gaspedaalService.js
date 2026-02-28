import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo, isScrapeDoAvailable, isPageBlocked } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const SOURCE_PLATFORM = 'gaspedaal';

/**
 * Run Gaspedaal.nl scraper
 * Hybrid approach: Puppeteer primary, scrape.do fallback (like mobile.de)
 * Streaming pagination (like leboncoin)
 * Flux: scrape → raw_listings → processRawListings → listings
 */
export async function runGaspedaalScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = { totalScraped: 0, saved: 0, errors: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 15;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    if (isScrapeDoAvailable()) {
      logger.info('Starting Gaspedaal scraper (scrape.do first)', { urls, options });
      for (const searchUrl of urls) {
        try {
          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const pageUrl = buildPageUrl(searchUrl, pageNum);
            let html;
            try {
              html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 4000, geoCode: 'nl' });
            } catch (err) {
              logger.warn('Gaspedaal scrape.do failed', { page: pageNum, error: err.message });
              break;
            }
            const listings = parseSearchPage(html);
            if (listings.length === 0) break;
            await saveRawListings(listings, SOURCE_PLATFORM);
            const processResult = await processRawListings({ limit: listings.length + 100, sourcePlatform: SOURCE_PLATFORM });
            results.totalScraped += listings.length;
            results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);
            if (progressCallback) await progressCallback({ totalScraped: results.totalScraped, totalSaved: results.saved, status: 'RUNNING', processedUrls: results.processedUrls });
            await new Promise(r => setTimeout(r, 1500));
          }
          results.processedUrls.push(searchUrl);
        } catch (err) {
          logger.error('Error scraping Gaspedaal URL', { url: searchUrl, error: err.message });
          results.errors++;
        }
      }
      return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
    }

    logger.info('Starting Gaspedaal scraper', { urls, options });

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping Gaspedaal URL', { url: searchUrl });

        await scrapeGaspedaalStreaming(browser, searchUrl, maxPages, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          await saveRawListings(pageListings, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: pageListings.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += pageListings.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('Gaspedaal batch saved', {
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
        logger.error('Error scraping Gaspedaal URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('Gaspedaal scraper completed', results);
    return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
  } catch (error) {
    logger.error('Error in Gaspedaal scraper', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Scrape Gaspedaal page-by-page, calling onPageDone(listings, pageNum) after each page.
 * Uses Puppeteer as primary, falls back to scrape.do if blocked.
 * No detail pages needed: all data is in the search result cards.
 */
async function scrapeGaspedaalStreaming(browser, baseUrl, maxPages, onPageDone) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.gaspedaal.nl/'
    });

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const pageUrl = buildPageUrl(baseUrl, pageNum);

      logger.info('Gaspedaal fetching search page', { page: pageNum, url: pageUrl });

      let html;
      let usedFallback = false;

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

        if (await isPageBlocked(page)) {
          logger.warn('Gaspedaal page blocked, falling back to scrape.do', { page: pageNum });
          html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 4000, geoCode: 'nl' });
          usedFallback = true;
        } else {
          html = await page.content();
        }
      } catch (err) {
        logger.warn('Gaspedaal Puppeteer failed, trying scrape.do', { page: pageNum, error: err.message });
        try {
          html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 4000, geoCode: 'nl' });
          usedFallback = true;
        } catch (fallbackErr) {
          logger.error('Gaspedaal search page fetch failed completely', { page: pageNum, error: fallbackErr.message });
          break;
        }
      }

      const listings = parseSearchPage(html);
      if (listings.length === 0) {
        logger.info('Gaspedaal no more listings found, stopping', { page: pageNum });
        break;
      }

      logger.info('Gaspedaal search page parsed', { page: pageNum, found: listings.length, usedFallback });

      await onPageDone(listings, pageNum);
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
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
 * Parse Gaspedaal search results HTML into listing objects.
 *
 * Card structure (from real HTML):
 *   <div data-testid="occasion-item" id="oc{ID}" class="group ...">
 *     <img src="https://cdn.gaspedaal.nl/images/..." />
 *     <div data-testid="price">59.995</div>
 *     <h2 class="isOccTitle">Brand Model - Description</h2>
 *     <p>Bouwjaar: 2018 Km.stand: 113.766 km</p>
 *     text: "Benzine 2.894cc 331kW Automaat Stationwagon Grijs 5-deurs"
 *     text: "DealerName City (Province)"
 *   </div>
 */
function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  $('[data-testid="occasion-item"]').each((_, el) => {
    const card = $(el);
    const rawId = card.attr('id') || '';
    const id = rawId.replace(/^oc/, '');
    if (!id || seen.has(id)) return;
    seen.add(id);

    const title = card.find('h2').first().text().trim();
    if (!title) return;

    const text = card.text().replace(/\s+/g, ' ');

    // Price from data-testid="price"
    const priceEl = card.find('[data-testid="price"]').first().text().trim();
    let price = null;
    if (priceEl) {
      price = parseInt(priceEl.replace(/\./g, ''), 10);
      if (price < 50 || price > 10000000) price = null;
    }

    // Image
    const imgSrc = card.find('img').first().attr('src') || null;
    const images = imgSrc ? [imgSrc] : [];

    // Brand & model from title: "Brand Model - Description"
    const titleParts = title.split(' - ');
    const brandModel = (titleParts[0] || '').trim();
    const brandModelParts = brandModel.split(/\s+/);
    const { brand, model } = extractBrandModel(brandModelParts);

    // Year: "Bouwjaar: 2018" or just a 4-digit year
    const yearMatch = text.match(/Bouwjaar[:\s]*(\d{4})/) || text.match(/\b(19\d{2}|20[012]\d)\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

    // Mileage: "Km.stand: 113.766 km" or "113.766 km"
    const kmMatch = text.match(/Km\.?stand[:\s]*([\d.]+)\s*km/i) || text.match(/([\d.]+)\s*km\b/i);
    let mileage = null;
    if (kmMatch) {
      mileage = parseInt(kmMatch[1].replace(/\./g, ''), 10);
      if (mileage > 5000000) mileage = null;
    }

    // Specs from card text (typically: "Benzine 2.894cc 331kW Automaat Stationwagon Grijs 5-deurs")
    const fuelType = extractFuelFromText(text);
    const transmission = extractTransmissionFromText(text);

    // Displacement: "2.894cc" or "1.498cc"
    let displacement = null;
    const ccMatch = text.match(/([\d.]+)\s*cc/i);
    if (ccMatch) {
      const ccVal = parseFloat(ccMatch[1].replace(/\./g, '').replace(',', '.'));
      displacement = ccVal > 100 ? ccVal / 1000 : ccVal;
    }

    // Power: "331kW" or "85kW"
    let powerKw = null;
    const kwMatch = text.match(/(\d+)\s*kW/i);
    if (kwMatch) powerKw = parseInt(kwMatch[1], 10);
    const powerHp = powerKw ? Math.round(powerKw * 1.36) : null;

    // Body type: Stationwagon, Hatchback, SUV, etc.
    const bodyType = extractBodyType(text);

    // Color: word before "-deurs"
    const colorMatch = text.match(/(\w+)\s+\d-deurs/i);
    const color = colorMatch ? colorMatch[1] : null;

    // Doors: "5-deurs"
    const doorsMatch = text.match(/(\d)-deurs/i);
    const doors = doorsMatch ? parseInt(doorsMatch[1], 10) : null;

    // Location: "City (XX)" where XX is province abbreviation
    const locationMatch = text.match(/([\wÀ-ÿ][\wÀ-ÿ\s-]*?)\s*\(([A-Z]{2})\)/);
    const locationCity = locationMatch ? locationMatch[1].trim() : null;
    const provinceCode = locationMatch ? locationMatch[2] : null;

    // Dealer: text before location that looks like a business name
    let dealerName = null;
    if (locationMatch) {
      const idx = text.indexOf(locationMatch[0]);
      const before = text.substring(Math.max(0, idx - 100), idx).trim();
      const segments = before.split(/\d-deurs/i);
      const lastSegment = (segments[segments.length - 1] || '').trim();
      if (lastSegment.length > 3 && lastSegment.length < 100 && !lastSegment.match(/^\d/)) {
        dealerName = lastSegment;
      }
    }

    const url = `https://www.gaspedaal.nl/zoeken?srt=df-a#${rawId}`;

    listings.push({
      url,
      id,
      brand,
      model,
      title,
      price,
      year,
      mileage,
      fuelType,
      transmission,
      displacement,
      power_hp: powerHp,
      bodyType,
      color,
      doors,
      locationCity,
      provinceCode,
      locationRegion: provinceCode ? PROVINCE_TO_REGION[provinceCode] || null : null,
      dealerName,
      images,
    });
  });

  return listings;
}

const MULTI_WORD_BRANDS = new Set([
  'alfa romeo', 'aston martin', 'mercedes-benz', 'land rover', 'rolls royce',
  'rolls-royce', 'de tomaso', 'ds automobiles',
]);

function extractBrandModel(parts) {
  if (parts.length === 0) return { brand: null, model: null };

  // Check for multi-word brands
  if (parts.length >= 2) {
    const twoWord = `${parts[0]} ${parts[1]}`.toLowerCase();
    if (MULTI_WORD_BRANDS.has(twoWord)) {
      return { brand: `${parts[0]} ${parts[1]}`, model: parts.slice(2).join(' ') || null };
    }
  }

  return { brand: parts[0], model: parts.slice(1).join(' ') || null };
}

function extractFuelFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('elektrisch') || lower.includes('electric')) return 'electric';
  if (lower.includes('hybride') || lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('diesel')) return 'diesel';
  if (lower.includes('benzine') || lower.includes('petrol')) return 'petrol';
  if (lower.includes('lpg')) return 'lpg';
  if (lower.includes('cng') || lower.includes('aardgas')) return 'cng';
  if (lower.includes('waterstof') || lower.includes('hydrogen')) return 'hydrogen';
  return null;
}

function extractTransmissionFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('automaat') || lower.includes('automatic') || lower.includes('dsg') || lower.includes('dct')) return 'automatic';
  if (lower.includes('handgeschakeld') || lower.includes('manual') || lower.includes('schakelbak')) return 'manual';
  return null;
}

const BODY_TYPES = [
  'stationwagon', 'hatchback', 'sedan', 'suv', 'terreinwagen', 'mpv',
  'cabriolet', 'cabrio', 'coupé', 'coupe', 'pick-up', 'pickup',
  'bestelwagen', 'bedrijfswagen', 'bus', 'compact',
];

function extractBodyType(text) {
  const lower = text.toLowerCase();
  for (const bt of BODY_TYPES) {
    if (lower.includes(bt)) return bt;
  }
  return null;
}

// ─── Dutch province code to region mapping ───

const PROVINCE_TO_REGION = {
  'DR': 'Drenthe',
  'FL': 'Flevoland',
  'FR': 'Friesland',
  'GE': 'Gelderland',
  'GR': 'Groningen',
  'LI': 'Limburg',
  'NB': 'Noord-Brabant',
  'NH': 'Noord-Holland',
  'OV': 'Overijssel',
  'UT': 'Utrecht',
  'ZE': 'Zeeland',
  'ZH': 'Zuid-Holland',
};

// ─── Dutch field mappings ───

const FUEL_MAP = {
  'benzine': 'petrol', 'diesel': 'diesel', 'elektrisch': 'electric', 'electric': 'electric',
  'hybride': 'hybrid', 'plug-in hybride': 'plug-in hybrid', 'waterstof': 'hydrogen',
  'lpg': 'lpg', 'cng': 'cng', 'aardgas': 'cng',
};

const TRANSMISSION_MAP = {
  'automaat': 'automatic', 'automatisch': 'automatic', 'handgeschakeld': 'manual',
  'handmatig': 'manual', 'cvt': 'automatic', 'semi-automaat': 'semi-automatic',
};

const CATEGORY_MAP = {
  'sedan': 'sedan', 'hatchback': 'hatchback', 'stationwagon': 'estate', 'station': 'estate',
  'suv': 'suv', 'terreinwagen': 'suv', 'cabriolet': 'convertible', 'cabrio': 'convertible',
  'coupé': 'coupe', 'coupe': 'coupe', 'mpv': 'mpv', 'bus': 'mpv',
  'pick-up': 'pickup', 'bestelwagen': 'van', 'bestel': 'van', 'bedrijfswagen': 'van',
  'compact': 'hatchback', 'kleine wagen': 'hatchback', 'gezinsauto': 'mpv',
};

function cleanFuelType(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return FUEL_MAP[v] || v || null;
}

function cleanTransmission(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (TRANSMISSION_MAP[v]) return TRANSMISSION_MAP[v];
  if (v.includes('auto')) return 'automatic';
  if (v.includes('hand')) return 'manual';
  return v || null;
}

function cleanCategory(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return CATEGORY_MAP[v] || v || null;
}

function cleanNumeric(raw) {
  if (!raw) return null;
  const n = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? null : n;
}

// ─── Mapping to listing schema ───

export function mapGaspedaalDataToListing(item) {
  const sourceListingId = item.id?.toString() || item.url;

  const price = parseInt(item.price, 10) || 0;
  const mileage = parseInt(item.mileage, 10) || 0;

  let year = parseInt(item.year, 10) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  const brand = (item.brand || '').toLowerCase() || null;
  const model = (item.model || '').toLowerCase() || null;

  const fuelType = cleanFuelType(item.fuelType || '');
  const transmission = cleanTransmission(item.transmission || '');
  const category = cleanCategory(item.bodyType || '');

  const locationCity = item.locationCity || null;
  const locationRegion = item.locationRegion || (item.provinceCode ? PROVINCE_TO_REGION[item.provinceCode] : null) || 'Netherlands';

  const sellerType = item.dealerName ? 'professional' : 'private';

  const { version, trim } = extractVersionTrim(item.title || '', {});

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
    location_country: 'NL',
    location_latitude: null,
    location_longitude: null,
    seller_type: sellerType,
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : [],
    specifications: {},
    description: null,
    posted_date: new Date(),
    fuel_type: fuelType,
    transmission,
    steering: 'LHD',
    color: item.color || null,
    doors: item.doors || null,
    power_hp: item.power_hp || null,
    displacement: item.displacement || null,
    version,
    trim,
    category,
    drivetrain: null,
  };
}

const KNOWN_TRIMS = new Set([
  'inscription', 'momentum', 'r-design', 'summum', 'style', 'edition',
  'titanium', 'vignale', 'st-line', 'trend', 'active', 'st',
  'r-line', 'highline', 'comfortline', 'trendline', 'life', 'elegance',
  'ambition', 'business', 'premium', 'pro', 's line', 's-line',
  'sport', 'luxury', 'executive', 'ultimate', 'gt', 'gt-line',
  'tekna', 'acenta', 'n-connecta', 'visia',
  'allure', 'feel', 'shine', 'flair',
  'amg', 'amg line', 'avantgarde', 'progressive', 'exclusive',
  'advance', 'se', 'sel', 'limited', 'platinum',
  'm sport', 'm-sport', 'xline', 'x-line', 'luxury line', 'sport line',
  'zen', 'intens', 'initiale paris', 'iconic', 'techno',
  'gs line', 'dynamicline', 'comfortline', 'first edition', 'launch edition',
  // Dutch market trims
  'style business', 'business line', 'collection', 'online edition',
  'plus', 'core', 'pure', 'ultra',
]);

function extractVersionTrim(title, specs) {
  let trim = null;
  let version = null;

  const titleLower = (title || '').toLowerCase();
  for (const t of KNOWN_TRIMS) {
    if (titleLower.includes(t)) {
      trim = t;
      break;
    }
  }

  const versionMatch = titleLower.match(/\b(4motion|4matic|xdrive|quattro|e-hybrid|plug-in|awd|4x4)\b/i);
  if (versionMatch) version = versionMatch[1];

  const specVersion = specs['uitvoering'] || specs['versie'] || specs['type'] || null;
  if (specVersion && !trim) trim = specVersion;

  return { version, trim };
}
