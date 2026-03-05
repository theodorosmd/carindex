import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { addToQueue } from './leboncoinQueueService.js';
import { fetchViaScrapeDo } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';

const SOURCE_PLATFORM = 'leboncoin';

/**
 * Run LeBonCoin scraper via scrape.do
 * Flux: recherche → queue (leboncoin_fetch_queue) → workers fetchent détails → raw_listings → listings
 */
export async function runLeBonCoinScraper(searchUrls, options = {}, progressCallback = null) {
  const results = { totalScraped: 0, addedToQueue: 0, errors: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 15;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting LeBonCoin scraper (queue mode)', { urls, options });

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping LeBonCoin URL', { url: searchUrl });

        await scrapeLeBonCoinStreaming(searchUrl, maxPages, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          const { added } = await addToQueue(pageListings);
          results.totalScraped += pageListings.length;
          results.addedToQueue += added;

          logger.info('LeBonCoin batch added to queue', {
            page: pageNum,
            batchSize: pageListings.length,
            added,
            totalScraped: results.totalScraped,
            totalInQueue: results.addedToQueue
          });

          if (progressCallback) {
            await progressCallback({
              totalScraped: results.totalScraped,
              totalSaved: results.addedToQueue,
              status: 'RUNNING',
              processedUrls: results.processedUrls
            });
          }
        });

        results.processedUrls.push(searchUrl);
      } catch (error) {
        logger.error('Error scraping LeBonCoin URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('LeBonCoin scraper completed (queue mode)', results);
    return { runId: null, totalScraped: results.totalScraped, saved: results.addedToQueue, processedUrls: results.processedUrls };
  } catch (error) {
    logger.error('Error in LeBonCoin scraper', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Scrape LeBonCoin page-by-page, calling onPageDone(listings, pageNum) after each page.
 */
/**
 * Scrape LeBonCoin search pages only. Add stubs to queue; workers fetch details.
 */
async function scrapeLeBonCoinStreaming(baseUrl, maxPages, onPageDone) {
  const pageConcurrency = parseInt(process.env.LEBONCOIN_CONCURRENT_PAGES || '5', 10) || 1;
  const delayBetweenPages = parseInt(process.env.LEBONCOIN_DELAY_PAGES_MS || '400', 10) || 300;

  for (let start = 1; start <= maxPages; start += pageConcurrency) {
    const pageNums = [];
    for (let i = 0; i < pageConcurrency && start + i <= maxPages; i++) pageNums.push(start + i);

    const pageResults = await Promise.all(pageNums.map(async (page) => {
      const pageUrl = page === 1 ? baseUrl : (baseUrl.includes('?') ? `${baseUrl}&page=${page}` : `${baseUrl}?page=${page}`);
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          let html = await fetchViaScrapeDo(pageUrl, { render: false, geoCode: 'fr', retries: 2 });
          let listings = parseSearchPage(html);
          if (listings.length === 0 && html?.length > 500) {
            html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 2500, geoCode: 'fr', retries: 2 });
            listings = parseSearchPage(html);
          }
          return { page, listings };
        } catch (err) {
          logger.warn('LeBonCoin search page fetch failed', { page, attempt, error: err.message });
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 3000 * attempt));
          } else {
            logger.error('LeBonCoin search page fetch failed (final)', { page, error: err.message });
            return { page, listings: [] };
          }
        }
      }
      return { page, listings: [] };
    }));

    for (const { page, listings } of pageResults) {
      if (listings.length === 0 && page === start) {
        logger.info('LeBonCoin no more listings found, stopping', { page });
        return;
      }
      if (listings.length === 0) continue;

      logger.info('LeBonCoin search page parsed', { page, found: listings.length });
      await onPageDone(listings, page);
    }
    await new Promise(r => setTimeout(r, delayBetweenPages + Math.random() * 300));
  }
}

/**
 * Parse LeBonCoin search results HTML into listing stubs.
 */
function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const listings = [];
  const seen = new Set();

  $('a[href*="/ad/voitures/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const fullUrl = href.startsWith('http') ? href : `https://www.leboncoin.fr${href}`;

    const idMatch = fullUrl.match(/\/ad\/voitures\/(\d+)/);
    if (!idMatch) return;
    const id = idMatch[1];
    if (seen.has(id)) return;
    seen.add(id);

    const card = $(el).closest('article, [data-test-id="ad"], [class*="adCard"]');
    const text = card.length ? card.text() : $(el).text();

    const title = card.find('h3').first().text().trim() ||
                  $(el).attr('title') ||
                  $(el).text().trim().substring(0, 100);

    const priceMatch = text.match(/(\d[\d\s.]*)\s*€/);
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    const kmMatch = text.match(/([\d\s.]+)\s*km/i);
    let mileage = null;
    if (kmMatch) {
      const raw = parseInt(kmMatch[1].replace(/[\s.]/g, ''), 10);
      // Cap to PostgreSQL integer max to avoid "out of range" in leboncoin_fetch_queue
      mileage = Number.isNaN(raw) || raw < 0 || raw > 2147483647 ? null : raw;
    }

    const parts = title.split(/\s+/);
    const brand = parts[0] || null;
    const model = parts.slice(1).join(' ') || null;

    listings.push({
      url: fullUrl,
      id,
      brand,
      model,
      title,
      price: priceMatch ? parseInt(priceMatch[1].replace(/[\s.]/g, ''), 10) : null,
      year: yearMatch ? parseInt(yearMatch[0], 10) : null,
      mileage,
    });
  });

  return listings;
}

/**
 * Fetch and parse a LeBonCoin detail page for full specs.
 * Uses JSON-LD Vehicle schema + data-qa-id criteria items.
 * Exported for use by leboncoin queue worker.
 */
export async function fetchListingDetails(listingUrl) {
  const html = await fetchViaScrapeDo(listingUrl, { geoCode: 'fr' });
  const $ = cheerio.load(html);
  const data = {};

  // JSON-LD Vehicle schema (primary source for structured data)
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

        // Vehicle-specific structured data
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

  // Fallback images
  if (!data.images || data.images.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) data.images = [ogImg];
  }

  // Title
  const h1 = $('[data-qa-id="adview_title"]').text().trim() || $('h1').first().text().trim();
  if (h1) data.fullTitle = data.fullTitle || h1;

  // Price
  const priceEl = $('[data-qa-id="adview_price"]').first().text().trim();
  if (priceEl) {
    const m = priceEl.match(/(\d[\d\s.]*)\s*€/);
    if (m) data.price = parseInt(m[1].replace(/[\s.]/g, ''), 10);
  }

  // Named criteria items — each has 2 child divs: label + value
  const specs = {};
  const criteriaMap = {
    criteria_item_u_car_brand: 'marque',
    criteria_item_u_car_model: 'modèle',
    criteria_item_mileage: 'kilométrage',
    criteria_item_fuel: 'carburant',
    criteria_item_gearbox: 'boîte de vitesse',
    criteria_item_issuance_date: 'mise en circulation',
    criteria_item_regdate: 'année-modèle',
    criteria_item_doors: 'portes',
    criteria_item_seats: 'places',
    criteria_item_horsepower: 'chevaux fiscaux',
    criteria_item_horse_power_din: 'puissance din',
    criteria_item_vehicule_color: 'couleur',
    criteria_item_vehicle_type: 'type de véhicule',
    criteria_item_vehicle_damage: 'état véhicule',
    criteria_item_critair: 'crit\'air',
    criteria_item_vehicle_euro_emissions_standard: 'norme euro',
    criteria_item_vehicle_specifications: 'finition',
    criteria_item_vehicle_upholstery: 'sellerie',
    criteria_item_vehicle_vsp: 'permis',
    criteria_item_vehicle_battery_state_of_health: 'état batterie',
  };

  function extractCriteriaValue($, el) {
    const children = $(el).children();
    if (children.length >= 2) {
      return $(children[children.length - 1]).text().trim();
    }
    return null;
  }

  for (const [qaId, label] of Object.entries(criteriaMap)) {
    const el = $(`[data-qa-id="${qaId}"]`);
    if (el.length) {
      const value = extractCriteriaValue($, el);
      if (value) specs[label] = value;
    }
  }

  $('[data-qa-id^="criteria_item_"]').each((_, el) => {
    const qaId = $(el).attr('data-qa-id');
    if (criteriaMap[qaId]) return;
    const children = $(el).children();
    if (children.length >= 2) {
      const label = $(children[0]).text().trim().toLowerCase();
      const value = $(children[children.length - 1]).text().trim();
      if (label && value) specs[label] = value;
    }
  });

  data.specifications = specs;

  // Description
  const descEl = $('[data-qa-id="adview_description_container"]').text().trim();
  if (descEl && descEl.length > 5) data.description = data.description || descEl;

  // __NEXT_DATA__ contains structured location, seller info, and more
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript);
      const ad = nextData?.props?.pageProps?.ad;
      if (ad) {
        const loc = ad.location || {};
        data.locationCity = loc.city || null;
        data.locationZipcode = loc.zipcode || null;
        data.locationRegion = loc.region_name || null;
        data.locationDepartment = loc.department_name || null;
        data.locationDepartmentId = loc.department_id || null;
        data.locationLat = loc.lat || null;
        data.locationLng = loc.lng || null;

        const owner = ad.owner || {};
        if (owner.type === 'pro' || owner.type === 'professional') data.sellerType = 'professional';
        else if (owner.type === 'private') data.sellerType = 'private';
        if (owner.name) data.sellerName = owner.name;

        if (ad.attributes) {
          for (const attr of ad.attributes) {
            const key = attr.key || attr.key_label || '';
            const val = attr.value_label || attr.value || '';
            if (key && val && !specs[key.toLowerCase()]) {
              specs[key.toLowerCase()] = val;
            }
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Fallback: extract location from visible text
  if (!data.locationCity) {
    $('span').each((_, el) => {
      const text = $(el).text().trim();
      const m = text.match(/^([A-ZÀ-Üa-zà-ü-]+(?:\s+[A-ZÀ-Üa-zà-ü-]+)*)\s+(\d{5})$/);
      if (m && !data.locationCity) {
        data.locationCity = m[1];
        data.locationZipcode = m[2];
      }
    });
  }

  return data;
}

// ─── French location helpers ───

const FRENCH_DEPT_TO_REGION = {
  '01': 'Auvergne-Rhône-Alpes', '03': 'Auvergne-Rhône-Alpes', '07': 'Auvergne-Rhône-Alpes',
  '15': 'Auvergne-Rhône-Alpes', '26': 'Auvergne-Rhône-Alpes', '38': 'Auvergne-Rhône-Alpes',
  '42': 'Auvergne-Rhône-Alpes', '43': 'Auvergne-Rhône-Alpes', '63': 'Auvergne-Rhône-Alpes',
  '69': 'Auvergne-Rhône-Alpes', '73': 'Auvergne-Rhône-Alpes', '74': 'Auvergne-Rhône-Alpes',
  '21': 'Bourgogne-Franche-Comté', '25': 'Bourgogne-Franche-Comté', '39': 'Bourgogne-Franche-Comté',
  '58': 'Bourgogne-Franche-Comté', '70': 'Bourgogne-Franche-Comté', '71': 'Bourgogne-Franche-Comté',
  '89': 'Bourgogne-Franche-Comté', '90': 'Bourgogne-Franche-Comté',
  '22': 'Bretagne', '29': 'Bretagne', '35': 'Bretagne', '56': 'Bretagne',
  '18': 'Centre-Val de Loire', '28': 'Centre-Val de Loire', '36': 'Centre-Val de Loire',
  '37': 'Centre-Val de Loire', '41': 'Centre-Val de Loire', '45': 'Centre-Val de Loire',
  '2A': 'Corse', '2B': 'Corse', '20': 'Corse',
  '08': 'Grand Est', '10': 'Grand Est', '51': 'Grand Est', '52': 'Grand Est',
  '54': 'Grand Est', '55': 'Grand Est', '57': 'Grand Est', '67': 'Grand Est', '68': 'Grand Est', '88': 'Grand Est',
  '02': 'Hauts-de-France', '59': 'Hauts-de-France', '60': 'Hauts-de-France',
  '62': 'Hauts-de-France', '80': 'Hauts-de-France',
  '75': 'Île-de-France', '77': 'Île-de-France', '78': 'Île-de-France', '91': 'Île-de-France',
  '92': 'Île-de-France', '93': 'Île-de-France', '94': 'Île-de-France', '95': 'Île-de-France',
  '14': 'Normandie', '27': 'Normandie', '50': 'Normandie', '61': 'Normandie', '76': 'Normandie',
  '16': 'Nouvelle-Aquitaine', '17': 'Nouvelle-Aquitaine', '19': 'Nouvelle-Aquitaine',
  '23': 'Nouvelle-Aquitaine', '24': 'Nouvelle-Aquitaine', '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine', '47': 'Nouvelle-Aquitaine', '64': 'Nouvelle-Aquitaine',
  '79': 'Nouvelle-Aquitaine', '86': 'Nouvelle-Aquitaine', '87': 'Nouvelle-Aquitaine',
  '09': 'Occitanie', '11': 'Occitanie', '12': 'Occitanie', '30': 'Occitanie',
  '31': 'Occitanie', '32': 'Occitanie', '34': 'Occitanie', '46': 'Occitanie',
  '48': 'Occitanie', '65': 'Occitanie', '66': 'Occitanie', '81': 'Occitanie', '82': 'Occitanie',
  '44': 'Pays de la Loire', '49': 'Pays de la Loire', '53': 'Pays de la Loire',
  '72': 'Pays de la Loire', '85': 'Pays de la Loire',
  '04': 'Provence-Alpes-Côte d\'Azur', '05': 'Provence-Alpes-Côte d\'Azur',
  '06': 'Provence-Alpes-Côte d\'Azur', '13': 'Provence-Alpes-Côte d\'Azur',
  '83': 'Provence-Alpes-Côte d\'Azur', '84': 'Provence-Alpes-Côte d\'Azur',
  '971': 'Guadeloupe', '972': 'Martinique', '973': 'Guyane', '974': 'La Réunion', '976': 'Mayotte',
};

function parseFrenchLocation(locationText) {
  if (!locationText) return { city: null, region: null };

  const cleaned = locationText.replace(/\s+/g, ' ').trim();

  const zipMatch = cleaned.match(/\b(\d{5})\b/);
  let region = null;
  if (zipMatch) {
    const zip = zipMatch[1];
    const dept = zip.startsWith('97') ? zip.substring(0, 3) : zip.substring(0, 2);
    region = FRENCH_DEPT_TO_REGION[dept] || null;
  }

  let city = cleaned
    .replace(/\d{5}/, '')
    .replace(/,/g, '')
    .trim();
  if (!city) city = null;

  return { city, region };
}

// ─── Cleanup helpers for concatenated label+value from broken criteria parsing ───

function cleanFuelType(raw) {
  if (!raw) return null;
  let v = raw.toLowerCase().trim();
  v = v.replace(/^[ée]nergie\s*/i, '');
  return FUEL_MAP[v] || v || null;
}

function cleanTransmission(raw) {
  if (!raw) return null;
  let v = raw.toLowerCase().trim();
  v = v.replace(/^bo[îi]te de vitesse\s*/i, '');
  if (TRANSMISSION_MAP[v]) return TRANSMISSION_MAP[v];
  if (v.includes('auto')) return 'automatic';
  if (v.includes('manu')) return 'manual';
  if (v.includes('séqu')) return 'sequential';
  return v || null;
}

function cleanCategory(raw) {
  if (!raw) return null;
  let v = raw.toLowerCase().trim();
  v = v.replace(/^type de v[ée]hicule\s*/i, '');
  v = v.replace(/^cat[ée]gorie\s*/i, '');
  v = v.replace(/^carrosserie\s*/i, '');
  return CATEGORY_MAP[v] || v || null;
}

function cleanColor(raw) {
  if (!raw) return null;
  let v = raw.trim();
  v = v.replace(/^couleur\s*/i, '');
  return v || null;
}

function cleanNumeric(raw) {
  if (!raw) return null;
  const n = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? null : n;
}

// ─── Mapping to listing schema ───

const FUEL_MAP = {
  'essence': 'petrol', 'diesel': 'diesel', 'électrique': 'electric', 'electrique': 'electric',
  'hybride': 'hybrid', 'hybride rechargeable': 'plug-in hybrid', 'plug-in hybride': 'plug-in hybrid',
  'gpl': 'lpg', 'gnv': 'cng', 'hydrogène': 'hydrogen', 'bioéthanol': 'ethanol', 'bioethanol': 'ethanol',
  'bicarburation essence/gpl': 'lpg', 'bicarburation essence / gpl': 'lpg',
};

const TRANSMISSION_MAP = {
  'automatique': 'automatic', 'manuelle': 'manual', 'séquentielle': 'sequential',
};

const CATEGORY_MAP = {
  'berline': 'sedan', 'break': 'estate', 'cabriolet': 'convertible',
  'citadine': 'hatchback', 'coupé': 'coupe', 'coupe': 'coupe',
  'monospace': 'mpv', 'suv': 'suv', '4x4': 'suv',
  'utilitaire': 'van', 'pick-up': 'pickup', 'fourgon': 'van',
  'mini citadine': 'hatchback', 'compact': 'hatchback', 'familiale': 'estate',
  '4x4, suv & crossover': 'suv', 'suv / tout-terrain': 'suv',
  'sedan': 'sedan',
};

const DOOR_MAP = {
  'sedan': 4, 'hatchback': 5, 'estate': 5, 'suv': 5,
  'coupe': 2, 'convertible': 2, 'mpv': 5, 'pickup': 4, 'van': 4,
};

export function mapLeBonCoinDataToListing(item) {
  const urlMatch = item.url?.match(/\/ad\/voitures\/(\d+)/) || item.url?.match(/\/(\d+)(?:\?|$)/);
  const sourceListingId = urlMatch ? urlMatch[1] : (item.id?.toString() || item.url);

  const specs = item.specifications || {};

  // Price: detail page > search card
  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price.amount || item.price.value || 0;
  } else if (typeof item.price === 'string') {
    priceValue = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
  } else {
    priceValue = item.price || 0;
  }
  const price = parseFloat(priceValue) || 0;

  // Mileage: JSON-LD > criteria > __NEXT_DATA__ attr > search card
  // Cap to PostgreSQL integer max (2^31-1) to avoid "out of range" / "numeric field overflow"
  const MAX_SAFE_MILEAGE = 2147483647;
  let mileage = item.jsonMileage || 0;
  if (!mileage) {
    const kmRaw = specs['kilométrage'] || specs['kilometrage'] || specs['mileage'] || '';
    mileage = parseInt(String(kmRaw).replace(/[\s.km]/gi, ''), 10) || 0;
  }
  if (!mileage) mileage = parseInt(item.mileage || 0, 10) || 0;
  if (mileage && (mileage < 0 || mileage > MAX_SAFE_MILEAGE)) mileage = 0;

  // Year: JSON-LD > criteria > __NEXT_DATA__ attr > search card
  let year = item.jsonYear || null;
  if (!year) {
    const yearRaw = specs['année-modèle'] || specs['mise en circulation'] || specs['regdate'] || '';
    const m = yearRaw.match(/\b(19|20)\d{2}\b/);
    year = m ? parseInt(m[0], 10) : null;
  }
  if (!year) year = parseInt(item.year, 10) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  // Brand & model: JSON-LD > criteria > __NEXT_DATA__ attr > search card title
  const brand = (item.jsonBrand || specs['marque'] || specs['brand'] || item.brand || '').toLowerCase() || null;
  const model = (item.jsonModel || specs['modèle'] || specs['model'] || item.model || '').toLowerCase() || null;

  // Fuel type: criteria > __NEXT_DATA__ attr > JSON-LD — clean concatenated prefix
  const fuelRaw = specs['carburant'] || specs['fuel'] || specs['énergie'] || specs['energie'] || item.jsonFuelType || '';
  const fuelType = cleanFuelType(fuelRaw);

  // Transmission: criteria > __NEXT_DATA__ attr > JSON-LD — clean concatenated prefix
  const transRaw = specs['boîte de vitesse'] || specs['boite de vitesse'] || specs['gearbox'] || item.jsonTransmission || '';
  const transmission = cleanTransmission(transRaw);

  // Power: criteria > __NEXT_DATA__ attr > JSON-LD
  const powerDin = specs['puissance din'] || specs['puissance_din'] || specs['horse_power_din'] || null;
  const powerFiscal = specs['chevaux fiscaux'] || specs['puissance fiscale'] || specs['horsepower'] || null;
  const powerHp = item.jsonPowerHp ||
    cleanNumeric(powerDin) ||
    cleanNumeric(powerFiscal) ||
    null;

  // Location: prefer structured __NEXT_DATA__, fallback to zip parsing
  let locationCity = item.locationCity || null;
  let locationRegion = item.locationRegion || null;
  let locationLat = item.locationLat || null;
  let locationLng = item.locationLng || null;

  if (!locationCity && item.locationText) {
    const parsed = parseFrenchLocation(item.locationText);
    locationCity = parsed.city;
    locationRegion = locationRegion || parsed.region;
  }
  if (!locationRegion && item.locationZipcode) {
    const dept = item.locationZipcode.startsWith('97') ? item.locationZipcode.substring(0, 3) : item.locationZipcode.substring(0, 2);
    locationRegion = FRENCH_DEPT_TO_REGION[dept] || null;
  }
  if (!locationRegion) locationRegion = 'France';

  // Seller type
  const sellerType = item.sellerType || (item.sellerName ? 'professional' : 'private');

  // Category: criteria > __NEXT_DATA__ attr > JSON-LD bodyType — clean concatenated prefix
  const catRaw = specs['type de véhicule'] || specs['type de vehicule'] || specs['vehicle_type'] || item.jsonBodyType || '';
  const category = cleanCategory(catRaw);

  // Doors: JSON-LD > criteria > __NEXT_DATA__ attr > infer from category
  const doorsSpec = cleanNumeric(specs['portes'] || specs['doors'] || specs['nombre de portes']);
  const doors = item.jsonDoors || doorsSpec || (category ? DOOR_MAP[category] || null : null);

  // Color: JSON-LD > criteria > __NEXT_DATA__ attr — clean concatenated prefix
  const color = item.jsonColor || cleanColor(specs['couleur'] || specs['vehicule_color'] || specs['couleur extérieure']) || null;

  // Displacement: JSON-LD > criteria > __NEXT_DATA__ attr
  let displacement = item.jsonDisplacement || null;
  if (!displacement) {
    const cylRaw = specs['cylindrée'] || specs['cylindree'] || specs['cubic_capacity'] || null;
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
    currency: 'EUR',
    location_city: locationCity,
    location_region: locationRegion,
    location_country: 'FR',
    location_latitude: locationLat,
    location_longitude: locationLng,
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
  'ambition', 'style', 'sportline', 'laurin & klement', 'l&k',
  'comfort', 'executive', 'lounge',
  'm sport', 'm-sport', 'xline', 'x-line', 'luxury line', 'sport line',
  'zen', 'intens', 'initiale paris', 'iconic', 'techno', 'evolution', 'equilibre',
  'elegance', 'gs', 'gs line', 'ultimate',
  'essential', 'expression', 'extreme', 'journey',
  // French market common trims
  'confort', 'dynamique', 'privilege', 'intense', 'riviera', 'rivoli',
  'puretech', 'tce', 'dci', 'hdi', 'tdi', 'bluehdi', 'e-tense',
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

  const specVersion = specs['version'] || specs['finition'] || null;
  if (specVersion && !trim) trim = specVersion;

  return { version, trim };
}
