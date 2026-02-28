import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';

const SOURCE_PLATFORM = 'coches.net';

/**
 * Run coches.net scraper via scrape.do
 * Flux: scrape → raw_listings → processRawListings → listings
 */
export async function runCochesNetScraper(searchUrls, options = {}, progressCallback = null) {
  const results = { totalScraped: 0, saved: 0, errors: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 15;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting coches.net scraper (scrape.do)', { urls, options });

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping coches.net URL', { url: searchUrl });

        await scrapeCochesNetStreaming(searchUrl, maxPages, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          await saveRawListings(pageListings, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: pageListings.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += pageListings.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('coches.net batch saved', {
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
        logger.error('Error scraping coches.net URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('coches.net scraper completed', results);
    return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
  } catch (error) {
    logger.error('Error in coches.net scraper', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Scrape coches.net page-by-page, calling onPageDone(listings, pageNum) after each page.
 */
async function scrapeCochesNetStreaming(baseUrl, maxPages, onPageDone) {
  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? baseUrl : (baseUrl.includes('?') ? `${baseUrl}&pg=${page}` : `${baseUrl}?pg=${page}`);

    logger.info('coches.net fetching search page', { page, url: pageUrl });

    let html;
    try {
      html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 4000, geoCode: 'es' });
    } catch (err) {
      logger.error('coches.net search page fetch failed', { page, error: err.message });
      break;
    }

    const listings = parseSearchPage(html);
    if (listings.length === 0) {
      logger.info('coches.net no more listings found, stopping', { page });
      break;
    }

    logger.info('coches.net search page parsed', { page, found: listings.length });

    const enriched = [];
    for (let i = 0; i < listings.length; i++) {
      const item = listings[i];
      try {
        logger.info('coches.net fetching detail', { page, listing: `${i + 1}/${listings.length}`, url: item.url });
        const details = await fetchListingDetails(item.url);
        enriched.push(details ? { ...item, ...details } : item);
      } catch (err) {
        logger.warn('coches.net detail fetch failed', { url: item.url, error: err.message });
        enriched.push(item);
      }
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    }

    await onPageDone(enriched, page);

    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
  }
}

/**
 * Parse coches.net search results HTML into listing stubs.
 *
 * Card structure:
 *   a.mt-CardAd-infoHeaderTitleLink[href*="-covo.aspx"] -> title + URL
 *   p.mt-CardAdPrice-cashAmount -> price
 *   li.mt-CardAd-attrItem -> fuel, year, km, cv
 *   .mt-CardAd-attrItemIconLabel -> location
 */
function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  $('a.mt-CardAd-infoHeaderTitleLink[href*="-covo.aspx"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const fullUrl = href.startsWith('http') ? href : `https://www.coches.net${href}`;

    const idMatch = fullUrl.match(/-(\d+)-covo\.aspx/);
    if (!idMatch) return;
    const id = idMatch[1];
    if (seen.has(id)) return;
    seen.add(id);

    const title = $(el).text().trim();

    const card = $(el).closest('.mt-CardAd, article, [class*="CardAd"]');

    const priceText = card.find('.mt-CardAdPrice-cashAmount').first().text().trim();
    const priceMatch = priceText.match(/([\d.,]+)\s*€/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/[.,\s]/g, ''), 10) : null;

    const attrs = [];
    card.find('.mt-CardAd-attrItem').each((_, attrEl) => {
      const attrText = $(attrEl).text().trim();
      if (attrText) attrs.push(attrText);
    });

    const locationEl = card.find('.mt-CardAd-attrItemIconLabel').first().text().trim();
    const location = locationEl || null;

    let year = null;
    let mileage = null;
    let fuelType = null;
    let powerCv = null;

    for (const attr of attrs) {
      const yearMatch = attr.match(/^(19|20)\d{2}$/);
      if (yearMatch) { year = parseInt(yearMatch[0], 10); continue; }

      const kmMatch = attr.match(/([\d.,]+)\s*km/i);
      if (kmMatch) { mileage = parseInt(kmMatch[1].replace(/[.,\s]/g, ''), 10); continue; }

      const cvMatch = attr.match(/([\d.,]+)\s*cv/i);
      if (cvMatch) { powerCv = parseInt(cvMatch[1].replace(/[.,\s]/g, ''), 10); continue; }

      if (FUEL_KEYWORDS.some(kw => attr.toLowerCase().includes(kw))) {
        fuelType = attr.trim();
        continue;
      }
    }

    const { brand, model } = extractBrandModel(title, fullUrl);

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
      powerCv,
      location,
    });
  });

  if (listings.length === 0) {
    $('a[href*="-covo.aspx"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const fullUrl = href.startsWith('http') ? href : `https://www.coches.net${href}`;
      const idMatch = fullUrl.match(/-(\d+)-covo\.aspx/);
      if (!idMatch) return;
      const id = idMatch[1];
      if (seen.has(id)) return;
      seen.add(id);

      const title = $(el).text().trim() || '';
      const card = $(el).closest('article, [class*="card"], [class*="Card"]') || $(el).parent();
      const text = card.text() || '';

      const priceMatch = text.match(/([\d.,]+)\s*€/);
      const yearMatch = text.match(/\b(19|20)\d{2}\b/);
      const kmMatch = text.match(/([\d.,]+)\s*km/i);
      const cvMatch = text.match(/([\d.,]+)\s*cv/i);

      const { brand, model } = extractBrandModel(title, fullUrl);

      listings.push({
        url: fullUrl,
        id,
        brand: brand,
        model: model,
        title: title.substring(0, 200),
        price: priceMatch ? parseInt(priceMatch[1].replace(/[.,\s]/g, ''), 10) : null,
        year: yearMatch ? parseInt(yearMatch[0], 10) : null,
        mileage: kmMatch ? parseInt(kmMatch[1].replace(/[.,\s]/g, ''), 10) : null,
      });
    });
  }

  return listings;
}

const FUEL_KEYWORDS = [
  'gasolina', 'diésel', 'diesel', 'eléctrico', 'electrico', 'híbrido', 'hibrido',
  'gas natural', 'gas licuado', 'glp', 'gnc', 'cng',
  'híbrido enchufable', 'hibrido enchufable', 'plug-in',
];

/**
 * Extract brand and model from title and URL.
 * URL pattern: /brand-model-specs-year-en-city-ID-covo.aspx
 * Title pattern: "BMW Serie 3 320d Auto."
 */
function extractBrandModel(title, url) {
  const parts = (title || '').split(/\s+/);
  let brand = parts[0] || null;
  let model = parts.slice(1).join(' ') || null;

  if (!brand && url) {
    const urlPath = url.replace(/^https?:\/\/[^/]+\//, '').replace(/-\d+-covo\.aspx.*/, '');
    const urlParts = urlPath.split('-');
    brand = urlParts[0] || null;
    model = urlParts.slice(1, 4).join(' ') || null;
  }

  return { brand, model };
}

/**
 * Fetch and parse a coches.net detail page for full specs.
 * Uses JSON-LD + structured HTML data.
 */
async function fetchListingDetails(listingUrl) {
  const html = await fetchViaScrapeDo(listingUrl, { render: true, customWait: 5000, geoCode: 'es' });
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

  if (!data.images || data.images.length === 0) {
    const imgs = [];
    $('img[src*="ccdn.es/vehicles"], img[src*="ccdn.es/cnet/vehicles"]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) imgs.push(src.replace(/\/\d+x\d+\w*\//, '/'));
    });
    if (imgs.length) data.images = [...new Set(imgs)];
  }

  const h1 = $('h1').first().text().trim();
  if (h1) data.fullTitle = data.fullTitle || h1;

  const priceEl = $('[data-testid="ad-detail-price"], .mt-AdDetail-price, [class*="AdPrice"] [class*="Amount"]').first().text().trim();
  if (priceEl) {
    const m = priceEl.match(/([\d.,]+)\s*€/);
    if (m) data.price = parseInt(m[1].replace(/[.,\s]/g, ''), 10);
  }

  const specs = {};

  $('[class*="technicalSheet"] li, [class*="TechnicalSheet"] li, [class*="features"] li').each((_, el) => {
    const children = $(el).children();
    if (children.length >= 2) {
      const label = $(children[0]).text().trim().toLowerCase();
      const value = $(children[children.length - 1]).text().trim();
      if (label && value) specs[label] = value;
    } else {
      const text = $(el).text().trim();
      const parts = text.split(':');
      if (parts.length === 2) {
        specs[parts[0].trim().toLowerCase()] = parts[1].trim();
      }
    }
  });

  $('dt, [class*="label"]').each((_, el) => {
    const label = $(el).text().trim().toLowerCase();
    const value = $(el).next('dd, [class*="value"]').text().trim();
    if (label && value && !specs[label]) specs[label] = value;
  });

  data.specifications = specs;

  const descEl = $('[class*="description"], [class*="Description"]').first().text().trim();
  if (descEl && descEl.length > 10) data.description = data.description || descEl;

  const sellerEl = $('[class*="seller"], [class*="Seller"], [class*="professional"], [class*="dealer"]');
  if (sellerEl.length) {
    const sellerText = sellerEl.text().toLowerCase();
    if (sellerText.includes('profesional') || sellerText.includes('concesionario')) {
      data.sellerType = 'professional';
    }
    const nameEl = sellerEl.find('[class*="name"], h2, h3').first().text().trim();
    if (nameEl) data.sellerName = nameEl;
  }

  return data;
}

// ─── Spanish fuel / transmission / category maps ───

const FUEL_MAP = {
  'gasolina': 'petrol', 'diesel': 'diesel', 'diésel': 'diesel',
  'eléctrico': 'electric', 'electrico': 'electric',
  'híbrido': 'hybrid', 'hibrido': 'hybrid',
  'híbrido enchufable': 'plug-in hybrid', 'hibrido enchufable': 'plug-in hybrid',
  'gas licuado (glp)': 'lpg', 'glp': 'lpg', 'gas licuado': 'lpg',
  'gas natural (cng)': 'cng', 'gnc': 'cng', 'gas natural': 'cng',
  'electrico/hibrido': 'hybrid', 'eléctrico/híbrido': 'hybrid',
};

const TRANSMISSION_MAP = {
  'automático': 'automatic', 'automatico': 'automatic', 'auto': 'automatic', 'automatic': 'automatic',
  'manual': 'manual',
  'secuencial': 'sequential',
};

const CATEGORY_MAP = {
  'berlina': 'sedan', 'familiar': 'estate', 'cabrio': 'convertible', 'cabriolet': 'convertible',
  'coupé': 'coupe', 'coupe': 'coupe',
  'monovolumen': 'mpv', 'suv': 'suv', '4x4': 'suv', 'todoterreno': 'suv',
  'pick up': 'pickup', 'pickup': 'pickup',
  'compacto': 'hatchback', 'utilitario': 'hatchback', 'pequeño': 'hatchback',
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
  if (v.includes('secu')) return 'sequential';
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

/**
 * Infer fuel type from URL path segments.
 * URL may contain: gasolina, diesel, electrico, hibrido, etc.
 */
function inferFuelFromUrl(url) {
  if (!url) return null;
  const path = url.toLowerCase();
  if (path.includes('electrico-hibrido') || path.includes('hibrido-enchufable')) return 'plug-in hybrid';
  if (path.includes('hibrido')) return 'hybrid';
  if (path.includes('electrico')) return 'electric';
  if (path.includes('diesel')) return 'diesel';
  if (path.includes('gasolina')) return 'petrol';
  if (path.includes('glp') || path.includes('gas-licuado')) return 'lpg';
  if (path.includes('gnc') || path.includes('gas-natural')) return 'cng';
  return null;
}

/**
 * Infer transmission from title or URL.
 */
function inferTransmission(title, url) {
  const text = ((title || '') + ' ' + (url || '')).toLowerCase();
  if (text.includes('auto') && !text.includes('autocaravana')) return 'automatic';
  if (text.includes('manual')) return 'manual';
  return null;
}

// ─── Mapping to listing schema ───

export function mapCochesNetDataToListing(item) {
  const urlMatch = item.url?.match(/-(\d+)-covo\.aspx/);
  const sourceListingId = urlMatch ? urlMatch[1] : (item.id?.toString() || item.url);

  const specs = item.specifications || {};

  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price.amount || item.price.value || 0;
  } else if (typeof item.price === 'string') {
    priceValue = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
  } else {
    priceValue = item.price || 0;
  }
  const price = parseFloat(priceValue) || 0;

  let mileage = item.jsonMileage || 0;
  if (!mileage) {
    const kmRaw = specs['kilómetros'] || specs['kilometros'] || specs['kilometraje'] || specs['km'] || '';
    mileage = parseInt(String(kmRaw).replace(/[.,\s]/g, '').replace(/km/gi, ''), 10) || 0;
  }
  if (!mileage) mileage = parseInt(item.mileage || 0, 10) || 0;

  let year = item.jsonYear || null;
  if (!year) {
    const yearRaw = specs['año'] || specs['matriculación'] || specs['matriculacion'] || specs['fecha matriculación'] || '';
    const m = yearRaw.match(/\b(19|20)\d{2}\b/);
    year = m ? parseInt(m[0], 10) : null;
  }
  if (!year) year = parseInt(item.year, 10) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  const brand = (item.jsonBrand || specs['marca'] || item.brand || '').toLowerCase() || null;
  const model = (item.jsonModel || specs['modelo'] || item.model || '').toLowerCase() || null;

  const fuelRaw = specs['combustible'] || specs['motor'] || specs['energía'] || specs['energia'] || item.jsonFuelType || item.fuelType || '';
  let fuelType = cleanFuelType(fuelRaw);
  if (!fuelType) fuelType = inferFuelFromUrl(item.url);

  const transRaw = specs['cambio'] || specs['transmisión'] || specs['transmision'] || specs['caja de cambios'] || item.jsonTransmission || '';
  let transmission = cleanTransmission(transRaw);
  if (!transmission) transmission = inferTransmission(item.fullTitle || item.title, item.url);

  const powerHp = item.jsonPowerHp || cleanNumeric(specs['potencia'] || specs['cv'] || specs['caballos']) || item.powerCv || null;

  let locationCity = item.location || null;
  const locationRegion = inferSpanishRegion(locationCity);

  const sellerType = item.sellerType || (item.sellerName ? 'professional' : 'private');

  const catRaw = specs['carrocería'] || specs['carroceria'] || specs['tipo'] || item.jsonBodyType || '';
  const category = cleanCategory(catRaw);

  const doorsSpec = cleanNumeric(specs['puertas'] || specs['nº puertas']);
  const doors = item.jsonDoors || doorsSpec || (category ? DOOR_MAP[category] || null : null);

  const color = item.jsonColor || specs['color'] || specs['color exterior'] || null;

  let displacement = item.jsonDisplacement || null;
  if (!displacement) {
    const cylRaw = specs['cilindrada'] || specs['motor'] || null;
    if (cylRaw) {
      const n = parseFloat(String(cylRaw).replace(',', '.').replace(/[^\d.]/g, ''));
      if (!isNaN(n)) displacement = n > 100 ? n / 1000 : n;
    }
  }

  const doorCount = inferDoorsFromUrl(item.url);
  const finalDoors = doors || doorCount;

  const { version, trim } = extractVersionTrim(item.fullTitle || item.title || '', specs);

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
    location_country: 'ES',
    location_latitude: null,
    location_longitude: null,
    seller_type: sellerType,
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : [],
    specifications: specs,
    description: item.description || null,
    posted_date: new Date(),
    fuel_type: fuelType,
    transmission,
    steering: 'LHD',
    color,
    doors: finalDoors,
    power_hp: powerHp,
    displacement,
    version,
    trim,
    category,
    drivetrain: null,
  };
}

/**
 * Infer door count from URL path (e.g. "-4p-" = 4 doors, "-5p-" = 5 doors).
 */
function inferDoorsFromUrl(url) {
  if (!url) return null;
  const m = url.match(/-(\d)p-/);
  return m ? parseInt(m[1], 10) : null;
}

// ─── Spanish region inference ───

const SPANISH_PROVINCE_TO_REGION = {
  'a coruña': 'Galicia', 'álava': 'País Vasco', 'alava': 'País Vasco',
  'albacete': 'Castilla-La Mancha', 'alicante': 'Comunitat Valenciana',
  'almería': 'Andalucía', 'almeria': 'Andalucía',
  'asturias': 'Asturias', 'ávila': 'Castilla y León', 'avila': 'Castilla y León',
  'badajoz': 'Extremadura', 'baleares': 'Illes Balears',
  'barcelona': 'Catalunya', 'burgos': 'Castilla y León',
  'cáceres': 'Extremadura', 'caceres': 'Extremadura',
  'cádiz': 'Andalucía', 'cadiz': 'Andalucía',
  'cantabria': 'Cantabria', 'castellón': 'Comunitat Valenciana', 'castellon': 'Comunitat Valenciana',
  'ceuta': 'Ceuta', 'ciudad real': 'Castilla-La Mancha',
  'córdoba': 'Andalucía', 'cordoba': 'Andalucía',
  'cuenca': 'Castilla-La Mancha', 'girona': 'Catalunya',
  'granada': 'Andalucía', 'guadalajara': 'Castilla-La Mancha',
  'guipúzcoa': 'País Vasco', 'guipuzcoa': 'País Vasco',
  'huelva': 'Andalucía', 'huesca': 'Aragón',
  'jaén': 'Andalucía', 'jaen': 'Andalucía',
  'la rioja': 'La Rioja', 'las palmas': 'Canarias',
  'león': 'Castilla y León', 'leon': 'Castilla y León',
  'lleida': 'Catalunya', 'lugo': 'Galicia',
  'madrid': 'Madrid', 'málaga': 'Andalucía', 'malaga': 'Andalucía',
  'melilla': 'Melilla', 'murcia': 'Murcia',
  'navarra': 'Navarra', 'orense': 'Galicia',
  'palencia': 'Castilla y León', 'pontevedra': 'Galicia',
  'salamanca': 'Castilla y León', 'segovia': 'Castilla y León',
  'sevilla': 'Andalucía', 'soria': 'Castilla y León',
  'sta. c. tenerife': 'Canarias', 'tenerife': 'Canarias',
  'tarragona': 'Catalunya', 'teruel': 'Aragón',
  'toledo': 'Castilla-La Mancha', 'valencia': 'Comunitat Valenciana',
  'valladolid': 'Castilla y León', 'vizcaya': 'País Vasco',
  'zamora': 'Castilla y León', 'zaragoza': 'Aragón',
};

function inferSpanishRegion(location) {
  if (!location) return 'España';
  const lower = location.toLowerCase().trim();
  return SPANISH_PROVINCE_TO_REGION[lower] || 'España';
}

// ─── Version / trim extraction ───

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
  'sportline', 'laurin & klement', 'l&k',
  'comfort', 'lounge',
  'm sport', 'm-sport', 'xline', 'x-line', 'luxury line', 'sport line',
  'zen', 'intens', 'initiale paris', 'iconic', 'techno', 'evolution', 'equilibre',
  'gs', 'gs line',
  'essential', 'expression', 'extreme', 'journey',
  'bastille', 'rivoli', 'performance line', 'la premiere',
  'xcite', 'xperience', 'fr', 'cupra',
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

  const versionMatch = titleLower.match(/\b(4motion|4matic|xdrive|quattro|e-hybrid|plug-in|awd|4x4|4wd)\b/i);
  if (versionMatch) version = versionMatch[1];

  const specVersion = specs['versión'] || specs['version'] || specs['acabado'] || null;
  if (specVersion && !trim) trim = specVersion;

  return { version, trim };
}
