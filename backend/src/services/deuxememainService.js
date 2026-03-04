import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';

const SOURCE_PLATFORM = '2ememain';
const BASE_URL = 'https://www.2ememain.be';

/**
 * Run 2ememain.be scraper via scrape.do (Belgium, Adevinta - like LeBonCoin)
 * Flux: scrape → raw_listings → processRawListings → listings
 */
export async function run2ememainScraper(searchUrls, options = {}, progressCallback = null) {
  const results = { totalScraped: 0, saved: 0, errors: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 15;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting 2ememain scraper (scrape.do)', { urls, options });

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping 2ememain URL', { url: searchUrl });

        await scrape2ememainStreaming(searchUrl, maxPages, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          await saveRawListings(pageListings, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: pageListings.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += pageListings.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('2ememain batch saved', {
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
        logger.error('Error scraping 2ememain URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('2ememain scraper completed', results);
    return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
  } catch (error) {
    logger.error('Error in 2ememain scraper', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Scrape 2ememain page-by-page.
 * Pagination: ?page=N (before hash) — e.g. .../l/autos/?page=2#f:10882
 */
async function scrape2ememainStreaming(baseUrl, maxPages, onPageDone) {
  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = buildPageUrl(baseUrl, page);
    logger.info('2ememain fetching search page', { page, url: pageUrl });

    let html;
    try {
      html = await fetchViaScrapeDo(pageUrl, { render: false, geoCode: 'be' });
      if (parseSearchPage(html).length === 0 && html?.length > 500) {
        html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 5000, geoCode: 'be' });
      }
    } catch (err) {
      logger.error('2ememain search page fetch failed', { page, error: err.message });
      break;
    }

    const listings = parseSearchPage(html);
    if (listings.length === 0) {
      logger.info('2ememain no more listings found, stopping', { page });
      break;
    }

    logger.info('2ememain search page parsed', { page, found: listings.length });

    const enriched = [];
    for (let i = 0; i < listings.length; i++) {
      const item = listings[i];
      try {
        logger.info('2ememain fetching detail', { page, listing: `${i + 1}/${listings.length}`, url: item.url });
        const details = await fetchListingDetails(item.url);
        enriched.push(details ? { ...item, ...details } : item);
      } catch (err) {
        logger.warn('2ememain detail fetch failed', { url: item.url, error: err.message });
        enriched.push(item);
      }
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    }

    await onPageDone(enriched, page);
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
  }
}

function buildPageUrl(baseUrl, page) {
  if (page === 1) return baseUrl;
  const u = new URL(baseUrl);
  u.searchParams.set('page', String(page));
  return u.toString();
}

/**
 * Parse 2ememain search results.
 * Links: /v/autos/{brand}/m{id}-{slug}
 */
function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  $('a[href*="/v/autos/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    const idMatch = fullUrl.match(/\/m(\d+)-/);
    if (!idMatch) return;
    const id = idMatch[1];
    if (seen.has(id)) return;
    seen.add(id);

    const card = $(el).closest('article, [data-testid], [class*="listing"], [class*="card"]').first();
    const text = card.length ? card.text() : $(el).text();
    const title = card.find('h2, h3, [class*="title"]').first().text().trim() ||
                  $(el).attr('title') ||
                  $(el).find('span').first().text().trim() ||
                  text.substring(0, 120);

    const priceMatch = text.match(/€\s*([\d\s.]+),?\s*-?/);
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    const kmMatch = text.match(/([\d\s.]+)\s*km/i);

    const parts = (title || '').split(/\s+/).filter(Boolean);
    const { brand, model } = extractBrandModel(parts);

    const fuelType = extractFuelFromText(text);
    const transmission = extractTransmissionFromText(text);
    const bodyType = extractBodyType(text);

    const img = card.find('img').first().attr('src') || $(el).find('img').first().attr('src');
    const images = img ? [img.startsWith('http') ? img : `${BASE_URL}${img}`] : [];

    listings.push({
      url: fullUrl,
      id,
      brand,
      model,
      title,
      price: priceMatch ? parseInt(priceMatch[1].replace(/[\s.]/g, ''), 10) : null,
      year: yearMatch ? parseInt(yearMatch[0], 10) : null,
      mileage: kmMatch ? parseInt(kmMatch[1].replace(/[\s.]/g, ''), 10) : null,
      fuelType,
      transmission,
      bodyType,
      images,
    });
  });

  return listings;
}

/**
 * Fetch and parse 2ememain detail page for full specs.
 * Uses JSON-LD Vehicle schema + __NEXT_DATA__ when available.
 */
async function fetchListingDetails(listingUrl) {
  const html = await fetchViaScrapeDo(listingUrl, { render: true, customWait: 3000, geoCode: 'be' });
  const $ = cheerio.load(html);
  const data = {};

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      if (json['@type'] === 'Vehicle' || json['@type'] === 'Car' || json['@type'] === 'Product') {
        if (Array.isArray(json.image)) {
          data.images = json.image.map(img => typeof img === 'string' ? img : img.contentUrl || img.url || '').filter(Boolean);
        } else if (typeof json.image === 'string') {
          data.images = [json.image];
        }
        if (json.offers?.seller?.['@type'] === 'Organization') data.sellerType = 'professional';
        if (json.name) data.fullTitle = json.name;
        if (json.description) data.description = json.description;
        if (json.brand) data.jsonBrand = typeof json.brand === 'object' ? json.brand.name : json.brand;
        if (json.model) data.jsonModel = json.model;
        if (json.vehicleModelDate) data.jsonYear = parseInt(json.vehicleModelDate, 10) || null;
        if (json.mileageFromOdometer) {
          const mVal = typeof json.mileageFromOdometer === 'object' ? json.mileageFromOdometer.value : json.mileageFromOdometer;
          data.jsonMileage = parseInt(String(mVal).replace(/\D/g, ''), 10) || null;
        }
        if (json.color) data.jsonColor = json.color;
        if (json.bodyType) data.jsonBodyType = json.bodyType;
        if (json.numberOfDoors) data.jsonDoors = parseInt(json.numberOfDoors, 10) || null;
        if (json.vehicleTransmission) data.jsonTransmission = json.vehicleTransmission;
        if (json.vehicleEngine) {
          const eng = json.vehicleEngine;
          if (eng.fuelType) data.jsonFuelType = eng.fuelType;
          if (eng.engineDisplacement) {
            const d = typeof eng.engineDisplacement === 'object' ? eng.engineDisplacement.value : eng.engineDisplacement;
            data.jsonDisplacement = parseFloat(String(d).replace(',', '.')) || null;
          }
          if (eng.enginePower) {
            const p = typeof eng.enginePower === 'object' ? eng.enginePower.value : eng.enginePower;
            data.jsonPowerHp = parseInt(String(p).replace(/\D/g, ''), 10) || null;
          }
        }
      }
    } catch { /* ignore */ }
  });

  if (!data.images || data.images.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) data.images = [ogImg];
  }

  const h1 = $('h1').first().text().trim();
  if (h1) data.fullTitle = data.fullTitle || h1;

  const priceEl = $('[class*="price"], [data-testid*="price"]').first().text().trim() || $('span').filter((_, e) => $(e).text().match(/€\s*[\d\s.]+/)).first().text().trim();
  if (priceEl) {
    const m = priceEl.match(/(\d[\d\s.]*)\s*€/);
    if (m) data.price = parseInt(m[1].replace(/[\s.]/g, ''), 10);
  }

  const nextDataScript = $('#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript);
      const ad = nextData?.props?.pageProps?.listing || nextData?.props?.pageProps?.ad;
      if (ad) {
        const loc = ad.location || ad.address || {};
        data.locationCity = loc.city || loc.locality || null;
        data.locationRegion = loc.region_name || loc.region || null;
        if (ad.seller?.type === 'professional' || ad.seller?.is_pro) data.sellerType = 'professional';
        if (ad.attributes) {
          for (const attr of ad.attributes) {
            const k = (attr.key || attr.key_label || '').toLowerCase();
            const v = attr.value_label || attr.value || '';
            if (k.includes('kilom') || k.includes('kilometer')) data.jsonMileage = data.jsonMileage || parseInt(String(v).replace(/\D/g, ''), 10);
            if (k.includes('carburant') || k.includes('brandstof')) data.jsonFuelType = data.jsonFuelType || v;
            if (k.includes('transmission') || k.includes('versnellingsbak')) data.jsonTransmission = data.jsonTransmission || v;
            if (k.includes('portes') || k.includes('deuren')) data.jsonDoors = data.jsonDoors || parseInt(v, 10);
            if (k.includes('couleur') || k.includes('kleur')) data.jsonColor = data.jsonColor || v;
            if (k.includes('puissance') || k.includes('vermogen')) data.jsonPowerHp = data.jsonPowerHp || parseInt(String(v).replace(/\D/g, ''), 10);
          }
        }
      }
    } catch { /* ignore */ }
  }

  return data;
}

const MULTI_WORD_BRANDS = new Set([
  'alfa romeo', 'aston martin', 'mercedes-benz', 'land rover', 'rolls royce',
  'rolls-royce', 'de tomaso', 'ds automobiles', 'range rover',
]);

function extractBrandModel(parts) {
  if (!parts || parts.length === 0) return { brand: null, model: null };
  if (parts.length >= 2) {
    const twoWord = `${parts[0]} ${parts[1]}`.toLowerCase();
    if (MULTI_WORD_BRANDS.has(twoWord)) {
      return { brand: `${parts[0]} ${parts[1]}`, model: parts.slice(2).join(' ') || null };
    }
  }
  return { brand: parts[0], model: parts.slice(1).join(' ') || null };
}

function extractFuelFromText(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('électrique') || lower.includes('elektrisch') || lower.includes('electric')) return 'electric';
  if (lower.includes('hybride') || lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('diesel')) return 'diesel';
  if (lower.includes('essence') || lower.includes('benzine') || lower.includes('petrol')) return 'petrol';
  if (lower.includes('lpg')) return 'lpg';
  if (lower.includes('gnc') || lower.includes('gaz naturel') || lower.includes('cng')) return 'cng';
  if (lower.includes('hydrogène') || lower.includes('waterstof')) return 'hydrogen';
  return null;
}

function extractTransmissionFromText(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('automatique') || lower.includes('automaat') || lower.includes('automatic')) return 'automatic';
  if (lower.includes('manuelle') || lower.includes('manuele') || lower.includes('manual')) return 'manual';
  if (lower.includes('boîte manuelle') || lower.includes('handgeschakeld')) return 'manual';
  return null;
}

const BODY_TYPES = [
  'suv', 'tout-terrain', 'break', 'berline', 'hatchback', 'cabriolet', 'coupé',
  'coupe', 'mpv', 'monospace', 'camionnette', 'camion', 'bestelwagen',
];

function extractBodyType(text) {
  const lower = (text || '').toLowerCase();
  for (const bt of BODY_TYPES) {
    if (lower.includes(bt)) return bt.replace(/-/g, ' ');
  }
  return null;
}

// ─── Belgian field mappings ───

const FUEL_MAP = {
  essence: 'petrol', benzine: 'petrol', diesel: 'diesel', électrique: 'electric', elektrisch: 'electric',
  hybride: 'hybrid', 'hybride électrique/essence': 'plug-in hybrid',
  lpg: 'lpg', gnc: 'cng', hydrogène: 'hydrogen',
};

const TRANSMISSION_MAP = {
  automatique: 'automatic', automaat: 'automatic', manuelle: 'manual', manuele: 'manual',
  'boîte manuelle': 'manual', handgeschakeld: 'manual',
};

const BODY_MAP = {
  suv: 'suv', 'tout-terrain': 'suv', break: 'estate', berline: 'sedan',
  hatchback: 'hatchback', cabriolet: 'convertible', coupé: 'coupe', mpv: 'mpv',
  monospace: 'mpv', camionnette: 'van', camion: 'truck',
};

/**
 * Map 2ememain raw payload to listing schema.
 */
export function map2ememainDataToListing(item) {
  const sourceListingId = item.id?.toString() || item.url;

  const price = parseInt(item.price, 10) || 0;
  const mileage = parseInt(item.mileage, 10) || parseInt(item.jsonMileage, 10) || 0;

  let year = parseInt(item.year, 10) || parseInt(item.jsonYear, 10) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  let brand = (item.brand || item.jsonBrand || '').toLowerCase().trim() || null;
  let model = (item.model || item.jsonModel || '').toLowerCase().trim() || null;
  if (!brand && item.title) {
    const parts = item.title.split(/\s+/).filter(Boolean);
    const { brand: b, model: m } = extractBrandModel(parts);
    brand = brand || (b || '').toLowerCase();
    model = model || (m || '').toLowerCase();
  }

  const fuelType = mapFuel(item.fuelType || item.jsonFuelType || '');
  const transmission = mapTransmission(item.transmission || item.jsonTransmission || '');
  const category = mapBody(item.bodyType || item.jsonBodyType || '');

  const locationCity = item.locationCity || null;
  const locationRegion = item.locationRegion || 'Belgium';

  const sellerType = (item.sellerType === 'professional' || item.sellerType === 'pro') ? 'professional' : 'private';

  const images = Array.isArray(item.images) ? item.images : [];

  const { version, trim } = extractVersionTrim(item.title || item.fullTitle || '', {});

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
    location_country: 'BE',
    location_latitude: null,
    location_longitude: null,
    seller_type: sellerType,
    url: item.url || null,
    images,
    specifications: {},
    description: item.description || null,
    posted_date: new Date(),
    fuel_type: fuelType,
    transmission,
    steering: 'LHD',
    color: (item.jsonColor || item.color || '').trim() || null,
    doors: parseInt(item.jsonDoors || item.doors, 10) || null,
    power_hp: parseInt(item.jsonPowerHp || item.power_hp, 10) || null,
    displacement: parseFloat(item.jsonDisplacement || item.displacement) || null,
    version,
    trim,
    category,
    drivetrain: null,
  };
}

function mapFuel(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return FUEL_MAP[v] || v || null;
}

function mapTransmission(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return TRANSMISSION_MAP[v] || (v.includes('auto') ? 'automatic' : v.includes('man') ? 'manual' : v) || null;
}

function mapBody(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return BODY_MAP[v] || v || null;
}

const KNOWN_TRIMS = new Set([
  'inscription', 'momentum', 'r-design', 'gt line', 's line', 'amg', 'm sport',
  'comfortline', 'highline', 'trendline', 'elegance', 'ambition', 'tekna',
  'allure', 'feel', 'flair', 'business', 'style', 'edition',
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
  return { version, trim };
}
