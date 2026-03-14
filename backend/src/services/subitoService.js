import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import { ITALIAN_PROVINCE_TO_REGION } from '../utils/locationUtils.js';

const SOURCE_PLATFORM = 'subito';

/**
 * Run Subito.it scraper via scrape.do
 * Flux: scrape → raw_listings → processRawListings → listings
 */
export async function runSubitoScraper(searchUrls, options = {}, progressCallback = null) {
  const results = { totalScraped: 0, saved: 0, errors: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 15;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting Subito.it scraper (scrape.do)', { urls, options });

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping Subito.it URL', { url: searchUrl });

        await scrapeSubitoStreaming(searchUrl, maxPages, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          await saveRawListings(pageListings, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: pageListings.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += pageListings.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('Subito.it batch saved', {
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
        logger.error('Error scraping Subito.it URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('Subito.it scraper completed', results);
    return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
  } catch (error) {
    logger.error('Error in Subito.it scraper', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Scrape Subito.it page-by-page, calling onPageDone(listings, pageNum) after each page.
 */
async function scrapeSubitoStreaming(baseUrl, maxPages, onPageDone) {
  let sitePosition = 0;
  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? baseUrl : (baseUrl.includes('?') ? `${baseUrl}&o=${page}` : `${baseUrl}?o=${page}`);

    logger.info('Subito.it fetching search page', { page, url: pageUrl });

    let html;
    try {
      html = await fetchViaScrapeDo(pageUrl, { render: false, geoCode: 'it' });
      if (parseSearchPage(html).length === 0 && html?.length > 500) {
        html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 5000, geoCode: 'it' });
      }
    } catch (err) {
      logger.error('Subito.it search page fetch failed', { page, error: err.message });
      break;
    }

    const listings = parseSearchPage(html);
    if (listings.length === 0) {
      logger.info('Subito.it no more listings found, stopping', { page });
      break;
    }

    logger.info('Subito.it search page parsed', { page, found: listings.length });

    const enriched = [];
    for (let i = 0; i < listings.length; i++) {
      const item = listings[i];
      try {
        logger.info('Subito.it fetching detail', { page, listing: `${i + 1}/${listings.length}`, url: item.url });
        const details = await fetchListingDetails(item.url);
        enriched.push(details ? { ...item, ...details } : item);
      } catch (err) {
        logger.warn('Subito.it detail fetch failed', { url: item.url, error: err.message });
        enriched.push(item);
      }
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    }

    enriched.forEach(l => { l.sitePosition = ++sitePosition; });
    await onPageDone(enriched, page);

    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
  }
}

/**
 * Parse Subito.it search results HTML into listing stubs.
 * Tries __NEXT_DATA__ JSON first (most reliable for Next.js), then DOM selectors.
 * Subito listing URLs follow: /auto-usate/{slug}-{id}.htm (or similar)
 */
function parseSearchPage(html) {
  // ── Primary: extract from __NEXT_DATA__ (Next.js hydration payload) ──────
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData?.props?.pageProps;
      // Try common prop shapes used by Subito
      const items = pageProps?.items || pageProps?.ads || pageProps?.listings
        || pageProps?.searchResult?.items || pageProps?.search?.ads || null;
      if (Array.isArray(items) && items.length > 0) {
        const listings = [];
        const seen = new Set();
        for (const item of items) {
          // Subito ads have: urn, urls, subject, body, price, geo, advertiser, features
          const id = String(item.urn || item.id || item.adId || '').replace(/[^0-9]/g, '') || null;
          if (!id || seen.has(id)) continue;
          seen.add(id);

          const urlObj = item.urls?.default || item.url || null;
          const fullUrl = typeof urlObj === 'string' ? urlObj
            : urlObj?.value ? urlObj.value
            : `https://www.subito.it/auto-usate/${id}.htm`;

          const title = item.subject || item.title || '';
          const parts = title.split(/\s+/);
          const brand = parts[0] || null;
          const model = parts.slice(1, 4).join(' ') || null;

          const priceObj = item.price || null;
          const price = priceObj?.value != null ? parseFloat(priceObj.value)
            : priceObj?.amount != null ? parseFloat(priceObj.amount)
            : null;

          const features = {};
          if (Array.isArray(item.features)) {
            for (const feat of item.features) {
              const key = (feat.label || feat.key || '').toLowerCase();
              const val = feat.values?.[0]?.value || feat.value || '';
              if (key && val) features[key] = val;
            }
          }

          const yearRaw = features['anno'] || features['immatricolazione'] || '';
          const yearMatch = yearRaw.match(/\b(19|20)\d{2}\b/);
          const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

          const kmRaw = features['chilometraggio'] || features['km'] || '';
          const mileage = parseInt(String(kmRaw).replace(/[\s.km]/gi, ''), 10) || null;

          const geo = item.geo || item.location || {};
          const locationCity = geo.city?.value || geo.city || null;
          const locationProvince = geo.town?.shortName || geo.province || null;

          const advertiser = item.advertiser || {};
          const sellerType = advertiser.type === 'shop' || advertiser.type === 'company'
            ? 'professional' : 'private';

          const images = [];
          if (Array.isArray(item.images)) {
            for (const img of item.images) {
              const src = img.uri || img.url || img.scale?.uri || '';
              if (src) images.push(src);
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
            fuelType: features['alimentazione'] || features['carburante'] || null,
            transmission: features['cambio'] || features['trasmissione'] || null,
            locationCity,
            locationProvince,
            sellerType,
            images,
            specifications: features,
          });
        }
        if (listings.length > 0) return listings;
      }
    } catch { /* fall through to DOM parsing */ }
  }

  // ── Fallback: DOM selector parsing ───────────────────────────────────────
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  $('a[href*="/auto-usate/"], a[href*="/vendita/auto/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : `https://www.subito.it${href}`;

    // Accept both old .htm URLs and new SPA-style paths (/-{id} or /{id})
    const idMatch = fullUrl.match(/-(\d{6,})(?:\.htm|\/|$)/) || fullUrl.match(/\/(\d{6,})(?:\.htm|\/|$)/);
    if (!idMatch) return;
    const id = idMatch[1];
    if (seen.has(id)) return;
    seen.add(id);

    const card = $(el).closest('div[class*="item"], div[class*="card"], div[class*="SmallCard"], div[class*="AdCard"], article, li');
    const text = card.length ? card.text() : $(el).text();

    const titleEl = card.find('h2, h3, [class*="title"], [class*="Title"]').first();
    const title = titleEl.text().trim() || $(el).attr('title') || $(el).text().trim().substring(0, 150);

    const priceMatch = text.match(/([\d.]+)\s*€/);
    const yearMatch = text.match(/\b(0[1-9]|1[0-2])\/((?:19|20)\d{2})\b/);
    const kmMatch = text.match(/([\d.]+)\s*[Kk][Mm]/);

    const locationMatch = text.match(/([A-ZÀ-Üa-zà-ü''\s-]+)\s*\(([A-Z]{2})\)/);

    const fuelMatch = text.match(/\b(Diesel|Benzina|Elettrica|Gpl|Metano|Ibrida|Ibrido)\b/i);
    const transmissionMatch = text.match(/\b(Manuale|Automatico|Sequenziale)\b/i);
    const euroMatch = text.match(/Euro\s*(\d[a-z]*)/i);

    const isDealer = /Rivenditore/i.test(text);

    const parts = title.split(/\s+/);
    const brand = parts[0] || null;
    const model = parts.slice(1, 4).join(' ') || null;

    listings.push({
      url: fullUrl,
      id,
      brand,
      model,
      title,
      price: priceMatch ? parseInt(priceMatch[1].replace(/\./g, ''), 10) : null,
      year: yearMatch ? parseInt(yearMatch[2], 10) : null,
      registrationDate: yearMatch ? `${yearMatch[1]}/${yearMatch[2]}` : null,
      mileage: kmMatch ? parseInt(kmMatch[1].replace(/\./g, ''), 10) : null,
      fuelType: fuelMatch ? fuelMatch[1].toLowerCase() : null,
      transmission: transmissionMatch ? transmissionMatch[1].toLowerCase() : null,
      euroStandard: euroMatch ? `Euro ${euroMatch[1]}` : null,
      locationCity: locationMatch ? locationMatch[1].trim() : null,
      locationProvince: locationMatch ? locationMatch[2] : null,
      sellerType: isDealer ? 'professional' : 'private',
    });
  });

  return listings;
}

/**
 * Fetch and parse a Subito.it detail page for full specs.
 * Uses JSON-LD schema + __NEXT_DATA__ + visible elements.
 */
async function fetchListingDetails(listingUrl) {
  const html = await fetchViaScrapeDo(listingUrl, { geoCode: 'it' });
  const $ = cheerio.load(html);
  const data = {};

  // JSON-LD structured data (Vehicle / Product / Car schema)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const item = json['@type'] === 'Vehicle' || json['@type'] === 'Car' || json['@type'] === 'Product' ? json : null;
      if (!item) return;

      if (Array.isArray(item.image)) {
        data.images = item.image.map(img => typeof img === 'string' ? img : img.contentUrl || img.url || '').filter(Boolean);
      } else if (typeof item.image === 'string') {
        data.images = [item.image];
      }
      if (item.name) data.fullTitle = item.name;
      if (item.description) data.description = item.description;
      if (item.brand) data.jsonBrand = typeof item.brand === 'object' ? item.brand.name : item.brand;
      if (item.model) data.jsonModel = item.model;
      if (item.vehicleModelDate) data.jsonYear = parseInt(item.vehicleModelDate, 10) || null;
      if (item.mileageFromOdometer) {
        const mVal = typeof item.mileageFromOdometer === 'object' ? item.mileageFromOdometer.value : item.mileageFromOdometer;
        data.jsonMileage = parseInt(String(mVal).replace(/\D/g, ''), 10) || null;
      }
      if (item.color) data.jsonColor = item.color;
      if (item.bodyType) data.jsonBodyType = item.bodyType;
      if (item.numberOfDoors) data.jsonDoors = parseInt(item.numberOfDoors, 10) || null;
      if (item.vehicleTransmission) data.jsonTransmission = item.vehicleTransmission;
      if (item.vehicleEngine) {
        const eng = item.vehicleEngine;
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
      if (item.offers) {
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        if (offer?.price) data.jsonPrice = parseFloat(offer.price) || null;
        if (offer?.priceCurrency) data.jsonCurrency = offer.priceCurrency;
        if (offer?.seller?.['@type'] === 'Organization') data.sellerType = 'professional';
      }
    } catch { /* ignore */ }
  });

  // Fallback images from og:image or gallery
  if (!data.images || data.images.length === 0) {
    const images = [];
    $('meta[property="og:image"]').each((_, el) => {
      const content = $(el).attr('content');
      if (content) images.push(content);
    });
    $('img[src*="images.subito.it"], img[src*="img.subito.it"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('logo') && !src.includes('icon')) images.push(src);
    });
    if (images.length > 0) data.images = [...new Set(images)];
  }

  // Title from h1
  const h1 = $('h1').first().text().trim();
  if (h1) data.fullTitle = data.fullTitle || h1;

  // Price from visible elements
  const priceText = $('[class*="price"], [class*="Price"], [data-testid*="price"]').first().text().trim();
  if (priceText) {
    const m = priceText.match(/([\d.]+)\s*€/);
    if (m) data.price = parseInt(m[1].replace(/\./g, ''), 10);
  }

  // Specs from detail key-value pairs
  const specs = {};
  $('[class*="feature"], [class*="Feature"], [class*="detail"], [class*="Detail"], [class*="spec"], [class*="info-bar"]').each((_, el) => {
    const children = $(el).children();
    if (children.length >= 2) {
      const label = $(children[0]).text().trim().toLowerCase();
      const value = $(children[children.length - 1]).text().trim();
      if (label && value && label.length < 50) specs[label] = value;
    }
  });

  // Try extracting specs from dt/dd pairs
  $('dt').each((_, el) => {
    const label = $(el).text().trim().toLowerCase();
    const value = $(el).next('dd').text().trim();
    if (label && value) specs[label] = value;
  });

  // Try extracting specs from table rows
  $('tr').each((_, el) => {
    const cells = $(el).find('td, th');
    if (cells.length >= 2) {
      const label = $(cells[0]).text().trim().toLowerCase();
      const value = $(cells[1]).text().trim();
      if (label && value && label.length < 50) specs[label] = value;
    }
  });

  data.specifications = specs;

  // Description
  const descEl = $('[class*="description"], [class*="Description"], [data-testid*="description"]').first().text().trim();
  if (descEl && descEl.length > 5) data.description = data.description || descEl;

  // __NEXT_DATA__ or similar app state
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript);
      const ad = nextData?.props?.pageProps?.item || nextData?.props?.pageProps?.ad || nextData?.props?.pageProps?.listing;
      if (ad) {
        const loc = ad.geo || ad.location || {};
        data.locationCity = loc.city?.value || loc.city || data.locationCity || null;
        data.locationProvince = loc.town?.shortName || loc.province || data.locationProvince || null;
        data.locationRegion = loc.region?.value || loc.region || null;
        data.locationLat = loc.lat || loc.latitude || null;
        data.locationLng = loc.lng || loc.longitude || null;

        if (ad.advertiser?.type === 'shop' || ad.advertiser?.type === 'company') data.sellerType = 'professional';
        else if (ad.advertiser?.type === 'private') data.sellerType = 'private';
        if (ad.advertiser?.name) data.sellerName = ad.advertiser.name;

        if (Array.isArray(ad.features)) {
          for (const feat of ad.features) {
            const key = (feat.label || feat.key || '').toLowerCase();
            const val = feat.values?.[0]?.value || feat.value || '';
            if (key && val && !specs[key]) specs[key] = val;
          }
        }

        if (ad.images && Array.isArray(ad.images) && (!data.images || data.images.length === 0)) {
          data.images = ad.images.map(img => img.uri || img.url || img.scale?.uri || '').filter(Boolean);
        }

        if (ad.subject && !data.fullTitle) data.fullTitle = ad.subject;
        if (ad.body && !data.description) data.description = ad.body;
      }
    } catch { /* ignore parse errors */ }
  }

  return data;
}

// ─── Italian region mapping from province codes (imported from locationUtils) ───
const PROVINCE_TO_REGION = ITALIAN_PROVINCE_TO_REGION;

// ─── Mapping helpers ───

const FUEL_MAP = {
  'diesel': 'diesel', 'benzina': 'petrol', 'elettrica': 'electric', 'elettrico': 'electric',
  'gpl': 'lpg', 'metano': 'cng', 'ibrida': 'hybrid', 'ibrido': 'hybrid',
  'ibrida/benzina': 'hybrid', 'ibrida/diesel': 'hybrid',
  'plug-in hybrid': 'plug-in hybrid', 'idrogeno': 'hydrogen',
  'benzina/gpl': 'lpg', 'benzina/metano': 'cng',
};

const TRANSMISSION_MAP = {
  'automatico': 'automatic', 'automatica': 'automatic',
  'manuale': 'manual',
  'sequenziale': 'sequential',
};

const CATEGORY_MAP = {
  'berlina': 'sedan', 'station wagon': 'estate', 'sw': 'estate',
  'cabrio': 'convertible', 'cabriolet': 'convertible',
  'citycar': 'hatchback', 'utilitaria': 'hatchback',
  'coupé': 'coupe', 'coupe': 'coupe',
  'monovolume': 'mpv', 'minivan': 'mpv',
  'suv': 'suv', 'fuoristrada': 'suv', 'crossover': 'suv',
  'furgone': 'van', 'van': 'van',
  'pick-up': 'pickup', 'pickup': 'pickup',
  'multispazio': 'mpv', 'familiare': 'estate',
  'sportiva': 'coupe', 'supercar': 'coupe',
  'sedan': 'sedan', 'hatchback': 'hatchback',
};

const DOOR_MAP = {
  'sedan': 4, 'hatchback': 5, 'estate': 5, 'suv': 5,
  'coupe': 2, 'convertible': 2, 'mpv': 5, 'pickup': 4, 'van': 4,
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
  if (v.includes('manu')) return 'manual';
  if (v.includes('sequ')) return 'sequential';
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

export function mapSubitoDataToListing(item) {
  const urlMatch = item.url?.match(/-(\d{6,})\.htm/);
  const sourceListingId = urlMatch ? urlMatch[1] : (item.id?.toString() || item.url);

  const specs = item.specifications || {};

  // Price
  let priceValue = 0;
  if (item.jsonPrice) {
    priceValue = item.jsonPrice;
  } else if (item.price && typeof item.price === 'object') {
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
    const kmRaw = specs['chilometraggio'] || specs['km'] || specs['percorrenza'] || specs['mileage'] || '';
    mileage = parseInt(String(kmRaw).replace(/[\s.km]/gi, ''), 10) || 0;
  }
  if (!mileage) mileage = parseInt(item.mileage || 0, 10) || 0;

  // Year
  let year = item.jsonYear || null;
  if (!year) {
    const yearRaw = specs['anno'] || specs['immatricolazione'] || specs['anno immatricolazione'] || '';
    const m = yearRaw.match(/\b(19|20)\d{2}\b/);
    year = m ? parseInt(m[0], 10) : null;
  }
  if (!year && item.registrationDate) {
    const m = item.registrationDate.match(/(19|20)\d{2}/);
    year = m ? parseInt(m[0], 10) : null;
  }
  if (!year) year = parseInt(item.year, 10) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  // Brand & model
  const brand = (item.jsonBrand || specs['marca'] || specs['brand'] || item.brand || '').toLowerCase() || null;
  const model = (item.jsonModel || specs['modello'] || specs['model'] || item.model || '').toLowerCase() || null;

  // Fuel type
  const fuelRaw = specs['alimentazione'] || specs['carburante'] || specs['fuel'] || item.jsonFuelType || item.fuelType || '';
  const fuelType = cleanFuelType(fuelRaw);

  // Transmission
  const transRaw = specs['cambio'] || specs['trasmissione'] || specs['transmission'] || item.jsonTransmission || item.transmission || '';
  const transmission = cleanTransmission(transRaw);

  // Power
  const powerRaw = specs['potenza'] || specs['cv'] || specs['cavalli'] || specs['kw'] || null;
  let powerHp = item.jsonPowerHp || cleanNumeric(powerRaw) || null;
  if (!powerHp && powerRaw) {
    const kwMatch = String(powerRaw).match(/(\d+)\s*kw/i);
    if (kwMatch) powerHp = Math.round(parseInt(kwMatch[1], 10) * 1.36);
  }

  // Location
  let locationCity = item.locationCity || null;
  let locationProvince = item.locationProvince || null;
  let locationRegion = item.locationRegion || null;
  let locationLat = item.locationLat || null;
  let locationLng = item.locationLng || null;

  if (!locationRegion && locationProvince) {
    locationRegion = PROVINCE_TO_REGION[locationProvince] || null;
  }
  if (!locationRegion) locationRegion = 'Italia';

  // Seller type
  const sellerType = item.sellerType || 'private';

  // Category
  const catRaw = specs['tipo veicolo'] || specs['carrozzeria'] || specs['categoria'] || item.jsonBodyType || '';
  const category = cleanCategory(catRaw);

  // Doors
  const doorsSpec = cleanNumeric(specs['porte'] || specs['numero porte']);
  const doors = item.jsonDoors || doorsSpec || (category ? DOOR_MAP[category] || null : null);

  // Color
  const color = item.jsonColor || specs['colore'] || specs['colore esterno'] || null;

  // Displacement
  let displacement = item.jsonDisplacement || null;
  if (!displacement) {
    const cylRaw = specs['cilindrata'] || specs['cc'] || null;
    if (cylRaw) {
      const n = parseFloat(String(cylRaw).replace(',', '.').replace(/[^\d.]/g, ''));
      if (!isNaN(n)) displacement = n > 100 ? n / 1000 : n;
    }
  }

  // Version / trim
  const { version, trim } = extractVersionTrim(item.fullTitle || item.title || '', specs);

  return {
    source_platform: SOURCE_PLATFORM,
    source_listing_id: String(sourceListingId),
    brand,
    model,
    year,
    mileage,
    price,
    currency: item.jsonCurrency || 'EUR',
    location_city: locationCity,
    location_region: locationRegion,
    location_country: 'IT',
    location_latitude: locationLat,
    location_longitude: locationLng,
    seller_type: sellerType,
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : [],
    specifications: specs,
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
  'comfort', 'executive', 'lounge',
  'm sport', 'm-sport', 'xline', 'x-line', 'luxury line', 'sport line',
  'zen', 'intens', 'initiale paris', 'iconic', 'techno', 'evolution', 'equilibre',
  'essential', 'expression', 'extreme', 'journey',
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

  const specVersion = specs['versione'] || specs['allestimento'] || specs['finition'] || null;
  if (specVersion && !trim) trim = specVersion;

  return { version, trim };
}
