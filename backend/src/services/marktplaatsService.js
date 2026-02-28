import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo, isPageBlocked } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const SOURCE_PLATFORM = 'marktplaats';

/**
 * Run Marktplaats.nl scraper
 * Hybrid approach: Puppeteer primary, scrape.do fallback (like Gaspedaal)
 * Flux: scrape → raw_listings → processRawListings → listings
 */
export async function runMarktplaatsScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = { totalScraped: 0, saved: 0, errors: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 15;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting Marktplaats scraper', { urls, options });

    // Prefer scrape.do if available (Marktplaats has strong anti-bot) - cheaper and often more reliable
    const useScrapeDo = !!process.env.SCRAPE_DO_TOKEN;
    if (!useScrapeDo) {
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
    }

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping Marktplaats URL', { url: searchUrl });

        await scrapeMarktplaatsStreaming(browser, searchUrl, maxPages, useScrapeDo, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          await saveRawListings(pageListings, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: pageListings.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += pageListings.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('Marktplaats batch saved', {
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
        logger.error('Error scraping Marktplaats URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('Marktplaats scraper completed', results);
    return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
  } catch (error) {
    logger.error('Error in Marktplaats scraper', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Scrape Marktplaats page-by-page.
 * Uses Puppeteer or scrape.do (Puppeteer primary with scrape.do fallback when blocked).
 */
async function scrapeMarktplaatsStreaming(browser, baseUrl, maxPages, preferScrapeDo, onPageDone) {
  const page = browser ? await browser.newPage() : null;

  try {
    if (page) {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.marktplaats.nl/'
      });
    }

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const pageUrl = buildPageUrl(baseUrl, pageNum);

      logger.info('Marktplaats fetching search page', { page: pageNum, url: pageUrl });

      let html;
      let usedFallback = false;

      if (preferScrapeDo && process.env.SCRAPE_DO_TOKEN) {
        try {
          html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 5000, geoCode: 'nl' });
          usedFallback = true;
        } catch (err) {
          logger.warn('Marktplaats scrape.do failed, trying Puppeteer', { page: pageNum, error: err.message });
          if (page) {
            await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(r => setTimeout(r, 4000));
            if (await isPageBlocked(page)) {
              throw new Error('Page blocked');
            }
            html = await page.content();
          } else {
            throw err;
          }
        }
      } else if (page) {
        try {
          await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await new Promise(r => setTimeout(r, 4000));

          if (await isPageBlocked(page)) {
            logger.warn('Marktplaats page blocked, falling back to scrape.do', { page: pageNum });
            html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 5000, geoCode: 'nl' });
            usedFallback = true;
          } else {
            html = await page.content();
          }
        } catch (err) {
          logger.warn('Marktplaats Puppeteer failed, trying scrape.do', { page: pageNum, error: err.message });
          try {
            html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 5000, geoCode: 'nl' });
            usedFallback = true;
          } catch (fallbackErr) {
            logger.error('Marktplaats search page fetch failed completely', { page: pageNum, error: fallbackErr.message });
            break;
          }
        }
      } else {
        html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 5000, geoCode: 'nl' });
      }

      const listings = parseSearchPage(html);
      if (listings.length === 0) {
        logger.info('Marktplaats no more listings found, stopping', { page: pageNum });
        break;
      }

      logger.info('Marktplaats search page parsed', { page: pageNum, found: listings.length, usedFallback });

      await onPageDone(listings, pageNum);
      await new Promise(r => setTimeout(r, 2500 + Math.random() * 2000));
    }
  } finally {
    if (page) await page.close();
  }
}

function buildPageUrl(baseUrl, pageNum) {
  if (pageNum === 1) return baseUrl;
  const url = new URL(baseUrl);
  const path = url.pathname.replace(/\/?$/, '');
  // Marktplaats uses /p/2/ style pagination for category pages
  if (path.includes('/l/')) {
    url.pathname = `${path}/p/${pageNum}/`;
  } else {
    url.searchParams.set('page', String(pageNum));
  }
  return url.toString();
}

/**
 * Parse Marktplaats search results HTML.
 * Structure: links to /v/auto-s/.../ID-slug, h2/h3 titles, price € X.XXX,-, year km, specs
 */
function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  // Marktplaats listing links: /v/auto-s/category/brand/aID-slug or mID-slug
  $('a[href*="/v/auto-s/"]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : `https://www.marktplaats.nl${href.startsWith('/') ? href : '/' + href}`;
    const idMatch = fullUrl.match(/\/([am]\d{8,})-/i) || fullUrl.match(/-([am]\d{8,})(?:-|$)/i);
    if (!idMatch) return;
    const id = idMatch[1];
    if (seen.has(id)) return;
    seen.add(id);

    const linkText = $link.text().trim();
    const card = $link.closest('article, [role="article"], [class*="Listing"], [class*="listing"], li');
    const block = card.length ? card : $link.parent();

    const titleEl = block.find('h2, h3, [class*="title"]').first();
    const title = (titleEl.length ? titleEl.text() : $link.text() || linkText).trim();
    if (!title || title.length < 5) return;

    const text = block.text().replace(/\s+/g, ' ');

    // Price: € 9.990,- or €9.990
    const priceMatch = text.match(/€\s*([\d.]+)[.,]?\s*-?/);
    let price = null;
    if (priceMatch) {
      price = parseInt(priceMatch[1].replace(/\./g, ''), 10);
      if (price < 50 || price > 10000000) price = null;
    }

    // Year: 4-digit
    const yearMatch = text.match(/\b(19\d{2}|20[0-2]\d)\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

    // Mileage: 151.348 km or 151348 km
    const kmMatch = text.match(/([\d.]+)\s*km\b/i);
    let mileage = null;
    if (kmMatch) {
      mileage = parseInt(kmMatch[1].replace(/\./g, ''), 10);
      if (mileage > 5000000) mileage = null;
    }

    const fuelType = extractFuelFromText(text);
    const transmission = extractTransmissionFromText(text);
    const bodyType = extractBodyType(text);
    const color = extractColorFromText(text);
    const doors = extractDoorsFromText(text);

    const { brand, model } = extractBrandModel(title);

    let locationCity = null;
    let dealerName = null;
    const lines = block.find('p, span, div').map((_, e) => $(e).text().trim()).get();
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line && line.length > 2 && line.length < 80 && !line.match(/^\d/) && !line.match(/€/)) {
        if (!locationCity && !line.match(/vandaag|gisteren|week|topadvertentie|dagtopper/i)) {
          locationCity = line;
        } else if (!dealerName && locationCity) {
          dealerName = line;
          break;
        }
      }
    }

    listings.push({
      url: fullUrl,
      id,
      brand,
      model,
      title,
      price,
      year,
      mileage,
      fuelType,
      transmission,
      bodyType,
      color,
      doors,
      locationCity,
      dealerName,
      images: []
    });
  });

  return listings;
}

const MULTI_WORD_BRANDS = new Set([
  'alfa romeo', 'aston martin', 'mercedes-benz', 'land rover', 'rolls royce',
  'rolls-royce', 'de tomaso', 'ds automobiles', 'lynk & co', 'lynk co'
]);

function extractBrandModel(title) {
  const parts = (title || '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { brand: null, model: null };
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
  if (lower.includes('waterstof')) return 'hydrogen';
  return null;
}

function extractTransmissionFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes('automaat') || lower.includes('automatic') || lower.includes('dsg') || lower.includes('dct')) return 'automatic';
  if (lower.includes('handgeschakeld') || lower.includes('manual')) return 'manual';
  return null;
}

const BODY_TYPES = [
  'stationwagon', 'hatchback', 'sedan', 'suv', 'terreinwagen', 'mpv',
  'cabriolet', 'cabrio', 'coupé', 'coupe', 'pick-up', 'pickup',
  'bestelbus', 'bestelwagen', 'bedrijfswagen', 'bus', 'compact',
];

function extractBodyType(text) {
  const lower = text.toLowerCase();
  for (const bt of BODY_TYPES) {
    if (lower.includes(bt)) return bt;
  }
  return null;
}

function extractColorFromText(text) {
  const colors = ['zwart', 'wit', 'grijs', 'zilver', 'blauw', 'rood', 'bruin', 'groen', 'beige'];
  const lower = text.toLowerCase();
  for (const c of colors) {
    if (lower.includes(c)) return c;
  }
  return null;
}

function extractDoorsFromText(text) {
  const m = text.match(/(\d)\s*[-]?deurs/i) || text.match(/(\d)\s*deuren/i);
  return m ? parseInt(m[1], 10) : null;
}

// ─── Dutch field mappings (same as Gaspedaal) ───

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
  'pick-up': 'pickup', 'bestelbus': 'van', 'bestelwagen': 'van', 'bedrijfswagen': 'van',
  'compact': 'hatchback',
};

function cleanFuelType(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return FUEL_MAP[v] || v || null;
}

function cleanTransmission(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return TRANSMISSION_MAP[v] || v || null;
}

function cleanCategory(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return CATEGORY_MAP[v] || v || null;
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
  'm sport', 'm-sport', 'xline', 'x-line',
  'first edition', 'launch edition', 'online edition',
]);

function extractVersionTrim(title) {
  const titleLower = (title || '').toLowerCase();
  for (const t of KNOWN_TRIMS) {
    if (titleLower.includes(t)) return { version: null, trim: t };
  }
  const versionMatch = titleLower.match(/\b(4motion|4matic|xdrive|quattro|e-hybrid|plug-in|awd|4x4)\b/i);
  return { version: versionMatch ? versionMatch[1] : null, trim: null };
}

// ─── Mapping to listing schema ───

export function mapMarktplaatsDataToListing(item) {
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
  const sellerType = item.dealerName ? 'professional' : 'private';

  const { version, trim } = extractVersionTrim(item.title || '');

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
    location_region: 'Netherlands',
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
