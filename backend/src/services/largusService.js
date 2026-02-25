import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import openaiService from './openaiService.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const SOURCE_PLATFORM = 'largus';
const BASE_URL = 'https://occasion.largus.fr';

/**
 * Run L'Argus (occasion.largus.fr) scraper - French used car marketplace
 * Flux : scrape → raw_listings → processRawListings → listings
 */
export async function runLargusScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = {
    totalScraped: 0,
    saved: 0,
    errors: 0,
    processedUrls: []
  };

  try {
    const maxPages = options.maxPages || 10;

    logger.info('Starting L\'Argus scraper (Puppeteer)', { searchUrls, options });

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

    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping L\'Argus URL', { url: searchUrl });

        let listings = await scrapeLargusUrl(browser, searchUrl, maxPages);

        const maxListings = options.maxListings;
        if (maxListings && listings.length > maxListings) {
          const had = listings.length;
          listings = listings.slice(0, maxListings);
          logger.info('L\'Argus limited to maxListings', { maxListings, had });
        }

        if (listings.length > 0 && options.fetchImages !== false) {
          listings = await enrichListingsWithImages(browser, listings);
        }

        logger.info('L\'Argus scraping completed', {
          url: searchUrl,
          listingsFound: listings.length
        });

        if (listings.length > 0) {
          // Stage 1: raw_listings (for debugging, re-processing)
          const { saved } = await saveRawListings(listings, SOURCE_PLATFORM);
          results.totalScraped += listings.length;

          // Stage 2: raw → listings (mapper + upsert)
          const processResult = await processRawListings({
            limit: 5000,
            sourcePlatform: SOURCE_PLATFORM
          });
          results.saved += (processResult.created || 0) + (processResult.updated || 0);
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
        logger.error('Error scraping L\'Argus URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('L\'Argus scraper completed', results);
    return {
      runId: null,
      totalScraped: results.totalScraped,
      saved: results.saved,
      processedUrls: results.processedUrls
    };
  } catch (error) {
    logger.error('Error in L\'Argus scraper', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Backfill: re-fetch detail pages for existing Largus listings and update missing columns
 */
export async function runLargusBackfill(options = {}) {
  const limit = options.limit || 50;

  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, url, brand, model, year, mileage, price, images, color, doors, transmission, description, category, drivetrain, displacement, version, trim, power_hp')
    .eq('source_platform', 'largus')
    .not('url', 'is', null)
    .limit(limit)
    .order('updated_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch largus listings', { error: error.message });
    throw error;
  }
  if (!listings || listings.length === 0) {
    logger.info('No largus listings to backfill');
    return { updated: 0, errors: 0, total: 0 };
  }

  logger.info('Backfilling largus listings', { count: listings.length });

  let browser = null;
  const results = { updated: 0, errors: 0, total: listings.length };

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      try {
        const details = await fetchLargusListingDetails(browser, listing.url);

        const updates = {};
        if (details.images && details.images.length > 0) updates.images = details.images;
        if (details.color) updates.color = details.color;
        if (details.doors != null) updates.doors = details.doors;
        if (details.transmission) updates.transmission = details.transmission;
        if (details.description) updates.description = details.description;
        if (details.category) updates.category = details.category;
        if (details.drivetrain) updates.drivetrain = details.drivetrain;
        if (details.displacement != null) updates.displacement = details.displacement;
        if (details.power_hp != null) updates.power_hp = details.power_hp;
        if (details.version) updates.version = String(details.version).substring(0, 100);
        if (details.version && !updates.trim) updates.trim = String(details.version).substring(0, 100);
        if (updates.description && updates.description.length > 5000) updates.description = updates.description.substring(0, 5000);

        if (updates.power_hp == null && listing.url) {
          const hp = extractPowerFromUrl(listing.url);
          if (hp) updates.power_hp = hp;
        }
        if (updates.displacement == null && listing.url) {
          const d = extractDisplacementFromUrl(listing.url);
          if (d) updates.displacement = d;
        }

        const stillMissing = (
          (!listing.transmission && !updates.transmission) ||
          (!listing.doors && updates.doors == null) ||
          (!listing.color && !updates.color) ||
          (!listing.power_hp && updates.power_hp == null) ||
          (!listing.category && !updates.category)
        );
        if (stillMissing && (listing.description || details.description) && process.env.OPENAI_API_KEY) {
          try {
            const merged = { ...listing, ...updates, description: listing.description || details.description };
            const aiFilled = await openaiService.fillMissingListingFields(merged);
            Object.entries(aiFilled).forEach(([k, v]) => {
              if (v != null && updates[k] == null) updates[k] = v;
            });
          } catch (err) {
            logger.warn('AI enrichment skipped', { id: listing.id, error: err.message });
          }
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          updates.last_seen = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('listings')
            .update(updates)
            .eq('id', listing.id);

          if (updateError) throw updateError;
          results.updated++;
        }
      } catch (err) {
        logger.warn('Backfill failed for listing', { id: listing.id, url: listing.url, error: err.message });
        results.errors++;
      }

      if ((i + 1) % 5 === 0) {
        logger.info('Backfill progress', { done: i + 1, total: listings.length });
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

/**
 * Scrape a single L'Argus search URL
 * URL structure: https://occasion.largus.fr/auto/?npp=15
 * Pagination: ?page=2 or &page=2
 */
async function scrapeLargusUrl(browser, url, maxPages = 10) {
  const page = await browser.newPage();
  const allListings = [];

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://occasion.largus.fr/'
    });

    let currentPage = 1;

    while (currentPage <= maxPages) {
      const pageUrl = currentPage === 1
        ? url
        : url.includes('?') ? `${url}&page=${currentPage}` : `${url}?page=${currentPage}`;

      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const pageListings = await page.evaluate((baseUrl) => {
        const items = [];
        const cards = document.querySelectorAll('.list-group-item.result');

        cards.forEach((card) => {
          const link = card.querySelector('a.main-link[href*="annonce-"]') || card.querySelector('a[href*="annonce-"]');
          if (!link) return;

          const href = link.href || (link.getAttribute('href') || '').replace(/^\//, baseUrl + '/');
          if (!href || !href.includes('annonce-')) return;

          const sourceListingId = link.getAttribute('data-annonceid') || (href.match(/annonce-([a-f0-9]+)_/i) || [])[1];
          if (!sourceListingId) return;

          const brand = link.getAttribute('data-marque') || null;
          const model = link.getAttribute('data-modele') || null;
          const titleEl = card.querySelector('h3.title-model, .title, h2, h3');
          const title = (brand && model) ? `${brand} ${model}` : (titleEl?.textContent?.trim() || '');

          const prixEl = card.querySelector('.prix');
          const priceText = prixEl?.textContent?.trim() || '';
          const priceMatch = priceText.match(/(\d{1,3}(?:\s?\d{3})*)/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, ''), 10) : null;

          const lis = Array.from(card.querySelectorAll('li')).map((li) => li.textContent?.trim()).filter(Boolean);
          let mileage = null;
          let year = null;
          let fuelType = null;
          let location = null;
          for (const t of lis) {
            if (/^\d{1,3}\s?\d{3}\s?km/i.test(t)) mileage = parseInt(t.replace(/\s/g, '').replace(/km/i, ''), 10);
            else if (/^\d{4}$/.test(t)) year = parseInt(t, 10);
            else if (/essence|diesel|hybride|electrique|electric|gaz/i.test(t)) fuelType = t;
            else location = t;
          }

          items.push({
            url: href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
            id: sourceListingId,
            brand,
            model,
            price,
            mileage,
            year,
            title,
            location,
            fuelType
          });
        });

        return items;
      }, BASE_URL);

      const valid = pageListings.filter((i) => i.url && i.id);
      allListings.push(...valid);

      if (valid.length === 0) break;

      logger.info('L\'Argus page scraped', { page: currentPage, found: valid.length });
      currentPage++;
    }

    return allListings;
  } finally {
    await page.close();
  }
}

/**
 * Fetch images + specs (couleur, portes, transmission, description, etc.) from each listing's detail page
 */
async function enrichListingsWithImages(browser, listings) {
  const enriched = [];
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    try {
      const details = await fetchLargusListingDetails(browser, listing.url);
      enriched.push({ ...listing, ...details });
    } catch (err) {
      logger.warn('Could not fetch details for listing', { url: listing.url, error: err.message });
      enriched.push({ ...listing, images: [] });
    }
    if ((i + 1) % 5 === 0) {
      logger.info('Fetched details', { progress: `${i + 1}/${listings.length}` });
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return enriched;
}

/**
 * Scrape images + specs from a L'Argus listing detail page
 * Informations générales : Prix, Kilométrage, Mise en circulation, Energie, Couleur, etc.
 * Description complète, transmission, portes, catégorie
 */
async function fetchLargusListingDetails(browser, listingUrl) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'Referer': 'https://occasion.largus.fr/'
    });
    await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));

    const result = await page.evaluate(() => {
      const out = { images: [], color: null, doors: null, transmission: null, description: null, category: null, displacement: null, drivetrain: null, version: null, power_hp: null };

      const seen = new Set();
      document.querySelectorAll('img[src*="assets.largus.fr"], img[src*="mixad"], img[src*="largus"], img[data-src*="largus"]').forEach((img) => {
        const url = (img.src || img.dataset.src || img.getAttribute('data-src') || '').split('?')[0];
        if (url && url.length > 20 && !seen.has(url)) { seen.add(url); out.images.push(url); }
      });
      document.querySelectorAll('[class*="gallery"] img, [class*="carousel"] img, .annonce-detail img').forEach((img) => {
        const url = (img.src || img.dataset.src || img.getAttribute('data-src') || '').split('?')[0];
        if (url && url.length > 20 && !seen.has(url)) { seen.add(url); out.images.push(url); }
      });

      document.querySelectorAll('ul.list-unstyled, [class*="spec"], [class*="caract"]').forEach((ul) => {
        const lis = Array.from(ul.querySelectorAll('li'));
        let lastCaption = '';
        lis.forEach((li) => {
          if (li.classList.contains('caption')) lastCaption = li.textContent?.trim().toLowerCase() || '';
          else if (li.classList.contains('value') && lastCaption) {
            const v = li.textContent?.trim() || '';
            if (v) {
              if (lastCaption.includes('couleur')) out.color = out.color || v;
              if (lastCaption.includes('portes')) out.doors = out.doors || parseInt(v.replace(/\D/g, ''), 10) || null;
              if ((lastCaption.includes('boîte') || lastCaption.includes('boite') || lastCaption.includes('transmission')) && v) {
                out.transmission = out.transmission || (/automatique|auto|9g|8g|eat|dsg|tiptronic|s-tronic|powershift|multitronic|stronic|bva|robot/i.test(v) ? 'automatic' : /manuelle|manu|bvm/i.test(v) ? 'manual' : null);
              }
              if (lastCaption.includes('cylindrée') || lastCaption.includes('cylindree')) out.displacement = out.displacement || parseFloat(v.replace(/[^\d.,]/g, '').replace(',', '.')) || null;
            }
            lastCaption = '';
          }
        });
      });

      const text = (document.body?.innerText || '').replace(/\s+/g, ' ');
      const html = document.body?.innerHTML || '';

      if (!out.doors) {
        const m = text.match(/(?:nombre de portes|portes)\s*:\s*(\d)/i) || text.match(/(\d)\s*portes?/i) || text.match(/,\s*(\d)\s*portes/i);
        if (m) out.doors = parseInt(m[1], 10);
      }

      if (!out.transmission) {
        const m1 = text.match(/(?:boîte|boite)(?:\s*de\s*vitesses?)?\s*:\s*(manuelle|automatique)/i);
        const m2 = text.match(/(9G-TRONIC|8G-TRONIC|BVA|EAT\d+|DSG|Tiptronic|PowerShift|robotisée|S-Tronic|BVM6|BVM5)/i);
        const m3 = text.match(/(\d+)\s*vitesses?/i);
        if (m1) out.transmission = /automatique/i.test(m1[1]) ? 'automatic' : 'manual';
        else if (m2) out.transmission = /BVA|tronic|EAT|DSG|PowerShift|robotisée|S-Tronic/i.test(m2[0]) ? 'automatic' : 'manual';
        else if (m3 && parseInt(m3[1], 10) >= 8) out.transmission = 'automatic';
        else if (m3 && parseInt(m3[1], 10) <= 6) out.transmission = 'manual';
      }

      const hpMatch = text.match(/(\d{2,3})\s*ch\b/i) || text.match(/(\d{2,3})\s*cv\b/i);
      if (hpMatch) {
        const hp = parseInt(hpMatch[1], 10);
        if (hp >= 50 && hp <= 2000) out.power_hp = hp;
      }

      const catTerms = ['suv', '4x4', 'berline', 'break', 'citadine', 'monospace', 'coupé', 'cabriolet', 'compact', 'utilitaire'];
      for (const term of catTerms) {
        if (new RegExp('\\b' + term + '\\b', 'i').test(text)) { out.category = term; break; }
      }

      if (/4matic|4x4|quattro|xdrive|4motion|awd|4matic/i.test(text) || /4matic|4x4|quattro|xdrive|4motion/i.test(html)) out.drivetrain = 'awd';

      const finitionMatch = text.match(/(?:finition|version|trim)\s*:\s*([^\n.]+)/i);
      if (finitionMatch) out.version = finitionMatch[1].trim();
      if (!out.version) {
        const trimTerms = ['business', 'feel', 'techno', 'intens', 'zen', 'life', 'touch', 'sport', 'gt', 'prestige', 'comfort', 'executive'];
        for (const t of trimTerms) {
          if (new RegExp('\\b' + t + '\\b', 'i').test(text)) { out.version = t; break; }
        }
      }

      if (!out.color) {
        const colors = ['Blanc', 'Noir', 'Bleu', 'Gris', 'Rouge', 'Argent', 'Vert', 'Marron', 'Beige', 'Orange', 'Jaune'];
        for (const c of colors) {
          if (new RegExp('\\b' + c.toLowerCase() + '\\b', 'i').test(text)) { out.color = c; break; }
        }
      }

      if (!out.displacement) {
        const dispM1 = text.match(/(\d)[,.\-](\d)\s*(?:l|litre|L|ch|dci|hdi|tce|puretech|tdi)?/i);
        const dispM2 = text.match(/\b(1\.2|1\.4|1\.5|1\.6|2\.0|1\.0|3\.0|2\.5|1\.8)\s*(?:l|litre|L)?/i);
        if (dispM1) out.displacement = parseFloat(dispM1[1] + '.' + dispM1[2]) || null;
        else if (dispM2) out.displacement = parseFloat(dispM2[1]) || null;
      }

      const descEl = document.querySelector('[class*="description"] [class*="texte"], .annonce-detail [class*="description"], [itemprop="description"]');
      if (descEl) {
        out.description = descEl.textContent?.trim().substring(0, 8000);
      } else {
        const m = text.match(/Description\s*([\s\S]{100,6000}?)(?=COMMERCIAL|Référence annonce|Garantie assimilée|Véhicule visible|Informations non|$)/i);
        if (m) out.description = m[1].trim();
      }

      return out;
    });

    return result || { images: [] };
  } finally {
    await page.close();
  }
}

/**
 * Extract power_hp from L'Argus URL slug (e.g. "puretech-110", "65ch", "tce-90ch")
 */
function extractPowerFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(\d{2,3})\s*ch/i) || url.match(/(?:puretech|tce|dci|tdi|tdci|bluehdi|e-tech|tbi)[_-](\d{2,3})(?:ch)?[_-]?/i);
  if (match) {
    const hp = parseInt(match[1], 10);
    return hp >= 50 && hp <= 2000 ? hp : null;
  }
  return null;
}

/**
 * Extract displacement from URL slug (e.g. "1-2", "2-0")
 */
function extractDisplacementFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/(\d)[\-_](\d)\s*(?:l|dci|hdi|tce|puretech)/i) || url.match(/(\d)[\-_](\d)(?:ch|k)/i);
  if (m) {
    const d = parseFloat(m[1] + '.' + m[2]);
    return d >= 0.8 && d <= 8 ? d : null;
  }
  return null;
}

/**
 * Extract trim/version from URL slug (e.g. "feel-s-s", "techno", "intens")
 */
function extractTrimFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const slug = url.split('_')[1] || '';
  const parts = slug.split('-').filter((p) => p.length > 2 && !/^\d+$/.test(p) && !/km/i.test(p));
  const trimTerms = ['feel', 'touch', 'techno', 'intens', 'zen', 'life', 'business', 'sport', 'gt', 'prestige'];
  const found = parts.find((p) => trimTerms.some((t) => p.toLowerCase().includes(t)));
  return found || null;
}

/**
 * Map L'Argus scraper data to our database schema
 * Remplit toutes les colonnes disponibles depuis les cartes + déductions (steering LHD pour FR, etc.)
 */
export function mapLargusDataToListing(item, sourcePlatform = 'largus') {
  const urlMatch = item.url?.match(/annonce-([a-f0-9]+)_/i) || item.url?.match(/annonce-([^_]+)_/);
  const sourceListingId = urlMatch ? urlMatch[1] : item.id || item.url;

  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price.value || item.price.amount || item.price.price || 0;
  } else if (typeof item.price === 'string') {
    priceValue = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
  } else {
    priceValue = item.price || item.priceValue || item.priceAmount || 0;
  }
  const price = parseFloat(priceValue) || 0;

  let mileageValue = item.mileage || item.kilometrage || item.km || 0;
  if (typeof mileageValue === 'string') {
    mileageValue = parseInt(mileageValue.replace(/[^\d]/g, ''), 10);
  }
  const mileage = parseInt(mileageValue) || 0;

  let yearValue = item.year || item.annee || item.firstRegistration;
  if (typeof yearValue === 'string') {
    const m = yearValue.match(/\b(19|20)\d{2}\b/);
    yearValue = m ? parseInt(m[0], 10) : parseInt(yearValue, 10);
  }
  let year = parseInt(yearValue) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  const fuelTypeMap = {
    diesel: 'diesel', essence: 'petrol', petrol: 'petrol',
    electrique: 'electric', electric: 'electric', hybride: 'hybrid',
    gaz: 'lpg'
  };
  const fuelTypeRaw = (item.fuelType || item.energie || '').toLowerCase();
  const fuelType = fuelTypeMap[fuelTypeRaw] || fuelTypeRaw || null;

  const normalizedBrand = (item.brand || item.marque || item.make || null)?.toLowerCase() || null;
  const normalizedModel = (item.model || null)?.toLowerCase() || null;

  const locationCity = item.location || item.location_city || null;
  const powerHp = parseInt(item.power_hp || item.power || item.puissance, 10) || extractPowerFromUrl(item.url) || null;
  const trim = item.trim || item.finition || item.version || extractTrimFromUrl(item.url) || null;

  const specBase = { ...(item.attributes || {}), ...(item.specifications || {}) };
  const specifications = {
    ...specBase,
    energie: item.fuelType || fuelType,
    localisation: locationCity,
    annee: year,
    kilometrage: mileage
  };

  const descParts = [];
  if (normalizedBrand) descParts.push(normalizedBrand);
  if (normalizedModel) descParts.push(normalizedModel);
  if (year) descParts.push(String(year));
  if (mileage) descParts.push(`${mileage.toLocaleString('fr-FR')} km`);
  if (price) descParts.push(`${price.toLocaleString('fr-FR')} €`);
  const description = item.description || item.text || (descParts.length ? descParts.join(' - ') : null);

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
    location_region: item.location_region || 'France',
    location_country: 'FR',
    location_latitude: item.location_latitude || null,
    location_longitude: item.location_longitude || null,
    seller_type: item.sellerType || 'professional',
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : item.imageUrls ? [item.imageUrls].flat() : [],
    specifications,
    description,
    posted_date: item.postedDate || item.date ? new Date(item.postedDate || item.date) : new Date(),
    fuel_type: fuelType,
    transmission: item.transmission || null,
    steering: 'LHD',
    color: item.color || null,
    doors: parseInt(item.doors || item.portes, 10) || null,
    power_hp: powerHp,
    displacement: parseFloat(item.displacement || item.cylindree) || extractDisplacementFromUrl(item.url) || null,
    version: item.version || trim || null,
    trim,
    category: item.category || item.categorie || null,
    drivetrain: item.drivetrain || (item.category?.toLowerCase().includes('4x4') ? 'awd' : null)
  };
}
