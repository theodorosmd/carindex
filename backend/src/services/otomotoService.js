import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';

const SOURCE_PLATFORM = 'otomoto';

/**
 * Run OtoMoto.pl scraper via scrape.do
 * Flux: scrape → raw_listings → processRawListings → listings
 * Poland (PL) - osobowe = passenger cars
 */
export async function runOtomotoScraper(searchUrls, options = {}, progressCallback = null) {
  const results = { totalScraped: 0, saved: 0, errors: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 15;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting OtoMoto.pl scraper (scrape.do)', { urls, options });

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping OtoMoto.pl URL', { url: searchUrl });

        await scrapeOtomotoStreaming(searchUrl, maxPages, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          await saveRawListings(pageListings, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: pageListings.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += pageListings.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('OtoMoto.pl batch saved', {
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
        logger.error('Error scraping OtoMoto.pl URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('OtoMoto.pl scraper completed', results);
    return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
  } catch (error) {
    logger.error('Error in OtoMoto.pl scraper', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Scrape OtoMoto.pl page-by-page, calling onPageDone(listings, pageNum) after each page.
 */
async function scrapeOtomotoStreaming(baseUrl, maxPages, onPageDone) {
  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? baseUrl : (baseUrl.includes('?') ? `${baseUrl}&page=${page}` : `${baseUrl}?page=${page}`);

    logger.info('OtoMoto.pl fetching search page', { page, url: pageUrl });

    let html;
    try {
      html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 5000, geoCode: 'pl' });
    } catch (err) {
      logger.error('OtoMoto.pl search page fetch failed', { page, error: err.message });
      break;
    }

    const listings = parseSearchPage(html);
    if (listings.length === 0) {
      logger.info('OtoMoto.pl no more listings found, stopping', { page });
      break;
    }

    logger.info('OtoMoto.pl search page parsed', { page, found: listings.length });

    const enriched = [];
    for (let i = 0; i < listings.length; i++) {
      const item = listings[i];
      try {
        if (item.url && item.url.includes('/oferta/')) {
          logger.info('OtoMoto.pl fetching detail', { page, listing: `${i + 1}/${listings.length}`, url: item.url });
          const details = await fetchListingDetails(item.url);
          enriched.push(details ? { ...item, ...details } : item);
        } else {
          enriched.push(item);
        }
      } catch (err) {
        logger.warn('OtoMoto.pl detail fetch failed', { url: item.url, error: err.message });
        enriched.push(item);
      }
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    }

    await onPageDone(enriched, page);

    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
  }
}

/**
 * Parse OtoMoto.pl search results HTML.
 * Listing URLs: /osobowe/oferta/[slug]-ID[alphanumeric].html
 * Param string pattern: mileage160 185 kmfuel_typeDieselgearboxAutomatycznayear2019
 */
function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  // Primary: links to listing detail pages
  $('a[href*="/osobowe/oferta/"], a[href*="otomoto.pl"][href*="/oferta/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const idMatch = href.match(/-ID([A-Za-z0-9]+)\.html/);
    if (!idMatch) return;

    const fullUrl = href.startsWith('http') ? href : `https://www.otomoto.pl${href.startsWith('/') ? href : '/' + href}`;
    const id = idMatch[1];
    if (seen.has(id)) return;
    seen.add(id);

    const card = $(el).closest('article, [class*="offer"], [class*="Offer"], [class*="card"], [class*="Card"], li');
    const text = card.length ? card.text() : $(el).parent().text();

    const titleEl = card.find('h1, h2, h3, [class*="title"], [class*="Title"]').first();
    const title = titleEl.text().trim() || $(el).text().trim().substring(0, 200);

    const { mileage, fuelType, transmission, year } = parseParamString(text);

    // Price: 9 494 EUR or 135 900 PLN
    const eurMatch = text.match(/([\d\s]+)\s*EUR/i);
    const plnMatch = text.match(/([\d\s]+)\s*PLN/i);
    const price = eurMatch
      ? parseInt(eurMatch[1].replace(/\s/g, ''), 10)
      : plnMatch
        ? parseInt(plnMatch[1].replace(/\s/g, ''), 10)
        : null;

    const locationMatch = text.match(/([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+)\s*\(([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+)\)/);
    const location = locationMatch ? locationMatch[1].trim() : null;

    const isFirma = /\bFirma\b/i.test(text);
    const sellerType = isFirma ? 'professional' : 'private';

    const parts = title.split(/\s+/);
    const brand = parts[0]?.replace(/-/g, '') || null;
    const model = parts.slice(1, 4).join(' ').replace(/-/g, ' ') || null;

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
      location,
      sellerType,
    });
  });

  // Fallback: articles/cards without listing links (use title + params only)
  if (listings.length === 0) {
    $('article, [data-cy="listing-item"]').each((idx, el) => {
      const $card = $(el);
      const text = $card.text();
      const titleEl = $card.find('h1, h2, h3, [class*="title"]').first();
      const title = titleEl.text().trim();
      if (!title || title.length < 5) return;

      const { mileage, fuelType, transmission, year } = parseParamString(text);
      const eurMatch = text.match(/([\d\s]+)\s*EUR/i);
      const plnMatch = text.match(/([\d\s]+)\s*PLN/i);
      const price = eurMatch ? parseInt(eurMatch[1].replace(/\s/g, ''), 10) : plnMatch ? parseInt(plnMatch[1].replace(/\s/g, ''), 10) : null;

      const linkEl = $card.find('a[href*="/oferta/"]').first();
      const href = linkEl.attr('href');
      const idMatch = href?.match(/-ID([A-Za-z0-9]+)\.html/);
      const id = idMatch ? idMatch[1] : `card-${idx}-${Date.now()}`;
      if (seen.has(id)) return;
      seen.add(id);

      const fullUrl = href && href.startsWith('http') ? href : href ? `https://www.otomoto.pl${href.startsWith('/') ? href : '/' + href}` : null;
      const locationMatch = text.match(/([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+)\s*\(([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+)\)/);
      const isFirma = /\bFirma\b/i.test(text);

      const parts = title.split(/\s+/);
      listings.push({
        url: fullUrl,
        id,
        brand: parts[0]?.replace(/-/g, '') || null,
        model: parts.slice(1, 4).join(' ').replace(/-/g, ' ') || null,
        title,
        price,
        year,
        mileage,
        fuelType,
        transmission,
        location: locationMatch ? locationMatch[1].trim() : null,
        sellerType: isFirma ? 'professional' : 'private',
      });
    });
  }

  return listings;
}

/**
 * Parse concatenated param string: mileage160 185 kmfuel_typeDieselgearboxAutomatycznayear2019
 */
function parseParamString(text) {
  let mileage = null;
  let fuelType = null;
  let transmission = null;
  let year = null;

  const kmMatch = text.match(/mileage([\d\s]+)\s*km/i);
  if (kmMatch) mileage = parseInt(kmMatch[1].replace(/\s/g, ''), 10);

  const fuelMatch = text.match(/fuel_type([A-Za-z\+]+)/i);
  if (fuelMatch) fuelType = fuelMatch[1].trim();

  const gearboxMatch = text.match(/gearbox([A-Za-z]+)/i);
  if (gearboxMatch) transmission = gearboxMatch[1].trim();

  const yearMatch = text.match(/year(\d{4})/i) || text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) year = parseInt(yearMatch[1] || yearMatch[0], 10);

  return { mileage, fuelType, transmission, year };
}

/**
 * Fetch and parse OtoMoto.pl detail page. Uses JSON-LD + HTML.
 */
async function fetchListingDetails(listingUrl) {
  const html = await fetchViaScrapeDo(listingUrl, { render: true, customWait: 4000, geoCode: 'pl' });
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
        if (json.offers) {
          const offer = Array.isArray(json.offers) ? json.offers[0] : json.offers;
          if (offer?.price) data.jsonPrice = parseFloat(offer.price) || null;
          if (offer?.priceCurrency) data.jsonCurrency = offer.priceCurrency;
          if (offer?.seller?.['@type'] === 'Organization') data.sellerType = 'professional';
        }
      }
    } catch { /* ignore */ }
  });

  if (!data.images?.length) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) data.images = [ogImg];
  }

  const h1 = $('h1').first().text().trim();
  if (h1) data.fullTitle = data.fullTitle || h1;

  const priceEl = $('[class*="price"], [data-testid*="price"]').first().text().trim();
  if (priceEl) {
    const m = priceEl.match(/([\d\s.,]+)\s*(EUR|PLN|zł)/i);
    if (m) data.price = parseInt(m[1].replace(/[\s.,]/g, ''), 10);
  }

  return data;
}

// ─── Polish fuel / transmission maps ───

const FUEL_MAP = {
  'diesel': 'diesel', 'benzyna': 'petrol', 'benzin': 'petrol',
  'elektryczny': 'electric', 'elektryczna': 'electric',
  'hybryda': 'hybrid', 'hybryd': 'hybrid',
  'hybryda plug-in': 'plug-in hybrid', 'hybryda plug-in': 'plug-in hybrid',
  'benzyna+lpg': 'lpg', 'lpg': 'lpg', 'gaz': 'lpg',
};

const TRANSMISSION_MAP = {
  'automatyczna': 'automatic', 'automatyczny': 'automatic',
  'manualna': 'manual', 'manualny': 'manual',
  'automatic': 'automatic', 'manual': 'manual',
};

function cleanFuelType(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim().replace(/\s+/g, ' ');
  return FUEL_MAP[v] || v || null;
}

function cleanTransmission(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return TRANSMISSION_MAP[v] || (v.includes('auto') ? 'automatic' : v.includes('manu') ? 'manual' : null);
}

export function mapOtomotoDataToListing(item) {
  const urlMatch = item.url?.match(/-ID([A-Za-z0-9]+)\.html/);
  const sourceListingId = urlMatch ? urlMatch[1] : (item.id?.toString() || item.url);

  let price = item.jsonPrice || item.price || 0;
  if (typeof price === 'string') price = parseFloat(price.replace(/[^\d.]/g, '')) || 0;
  const priceNum = parseFloat(price) || 0;

  let mileage = item.jsonMileage || item.mileage || 0;
  mileage = parseInt(mileage, 10) || 0;

  let year = item.jsonYear || item.year || null;
  year = parseInt(year, 10) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  const brand = (item.jsonBrand || item.brand || '').toLowerCase() || null;
  const model = (item.jsonModel || item.model || '').toLowerCase() || null;

  const fuelRaw = item.jsonFuelType || item.fuelType || '';
  const fuelType = cleanFuelType(fuelRaw);

  const transRaw = item.jsonTransmission || item.transmission || '';
  const transmission = cleanTransmission(transRaw);

  const powerHp = item.jsonPowerHp || null;
  const currency = item.jsonCurrency === 'PLN' ? 'PLN' : 'EUR';

  return {
    source_platform: SOURCE_PLATFORM,
    source_listing_id: String(sourceListingId),
    brand,
    model,
    year,
    mileage,
    price: priceNum,
    currency,
    location_city: item.location || null,
    location_region: item.location || null,
    location_country: 'PL',
    location_latitude: null,
    location_longitude: null,
    seller_type: item.sellerType || 'private',
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : [],
    specifications: item.specifications || {},
    description: item.description || null,
    posted_date: new Date(),
    fuel_type: fuelType,
    transmission,
    steering: 'LHD',
    color: item.jsonColor || null,
    doors: item.jsonDoors || null,
    power_hp: powerHp,
    displacement: item.jsonDisplacement || null,
    version: null,
    trim: null,
    category: item.jsonBodyType || null,
    drivetrain: null,
  };
}
