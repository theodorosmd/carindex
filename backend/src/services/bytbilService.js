import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { fetchViaScrapeDo, isScrapeDoAvailable, isPageBlocked } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import { launchBrowser } from '../utils/puppeteerLaunch.js';
import { fetchAndPersistSiteTotal } from './sourceSiteTotalsService.js';

/** Extract total from Bytbil HTML. Button shows "Sök 82 011 fordon". */
function parseSiteTotalFromHtml(html) {
  const match = html.match(/([\d\s]+)\s*fordon/i);
  if (!match) return null;
  const n = parseInt(match[1].replace(/\s/g, ''), 10);
  return isNaN(n) ? null : n;
}

/** Fetch Bytbil site total (delegates to sourceSiteTotalsService). */
export async function fetchAndPersistBytbilSiteTotal() {
  return fetchAndPersistSiteTotal('bytbil');
}

/**
 * Run Bytbil.com scraper and save results to database
 * Bytbil.com is a Swedish used car marketplace (~400k visitors/month)
 */
export async function runBytbilScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = {
    totalScraped: 0,
    saved: 0,
    errors: 0,
    processedUrls: []
  };

  try {
    logger.info('Starting Bytbil.com scraper', { searchUrls, options });

    browser = await launchBrowser();

    for (const searchUrl of searchUrls) {
      try {
        logger.info('Scraping Bytbil.com URL', { url: searchUrl });

        let listings = await scrapeBytbilUrl(browser, searchUrl, options.maxPages || 10);

        // Puppeteer on datacenter IPs often gets soft-blocked (no captcha, just 0 results).
        // If nothing was found via Puppeteer, fall back to scrape.do before giving up.
        if (listings.length === 0 && isScrapeDoAvailable()) {
          logger.info('Bytbil: Puppeteer returned 0 listings, trying scrape.do fallback', { url: searchUrl });
          listings = await scrapeBytbilSearchViaScraper(searchUrl, options.maxPages || 10);
        }

        logger.info('Bytbil.com scraping completed', {
          url: searchUrl,
          listingsFound: listings.length
        });

        // Stage 1: Store raw scraped data as-is
        try {
          await saveRawListings(listings, 'bytbil');
        } catch (rawErr) {
          logger.warn('Raw listing save failed', { error: rawErr.message });
        }

        // Stage 2: Map and save to listings
        for (const listing of listings) {
          try {
            const saved = await saveBytbilListing(listing);
            if (saved) {
              results.saved++;
            }
            results.totalScraped++;
          } catch (error) {
            logger.warn('Error saving Bytbil listing', { error: error.message, listing });
            results.errors++;
          }
        }

        results.processedUrls.push(searchUrl);

        // Progress callback
        if (progressCallback) {
          await progressCallback({
            totalScraped: results.totalScraped,
            totalSaved: results.saved,
            status: 'RUNNING',
            processedUrls: results.processedUrls
          });
        }

      } catch (error) {
        logger.error('Error scraping Bytbil URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('Bytbil.com scraper completed', results);
    return results;

  } catch (error) {
    logger.error('Error in Bytbil.com scraper', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape a single Bytbil.com search URL
 */
async function scrapeBytbilUrl(browser, url, maxPages = 10) {
  const page = await browser.newPage();
  const listings = [];
  let pageClosed = false; // guard against double-close in finally

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extract site total (e.g. "Sök 82 011 fordon") and persist
    try {
      const html = await page.content();
      const total = parseSiteTotalFromHtml(html);
      if (total != null && total > 0) {
        await supabase
          .from('source_site_totals')
          .upsert(
            { source_platform: 'bytbil', total_available: total, last_updated: new Date().toISOString() },
            { onConflict: 'source_platform' }
          );
        logger.info('Bytbil site total persisted from page', { total });
      }
    } catch (e) {
      logger.debug('Could not extract Bytbil site total', { error: e?.message });
    }

    if (await isPageBlocked(page)) {
      logger.warn('Bytbil page blocked, falling back to scrape.do', { url });
      pageClosed = true;
      await page.close();
      return await scrapeBytbilSearchViaScraper(url, maxPages);
    }

    await page.waitForSelector('.result-thumbs-item', { timeout: 10000 }).catch(() => {
      logger.warn('No listings found on Bytbil page', { url });
    });

    const pageListings = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.result-thumbs-item');

      cards.forEach(card => {
        try {
          const link = card.querySelector('a.js-link-target');
          const title = card.querySelector('h3')?.textContent?.trim();
          const priceText = card.querySelector('.car-price-main')?.textContent?.trim();
          const imageDiv = card.querySelector('.car-image');
          const image = imageDiv?.getAttribute('data-background') || null;
          const modelId = card.querySelector('[data-model-id]')?.getAttribute('data-model-id');

          // car-info: "2025 | 45 000 mil | Upplands Väsby"
          const carInfoText = card.querySelector('.car-info')?.textContent || '';
          const parts = carInfoText.split('|').map(s => s.trim()).filter(Boolean);
          const year = parts[0] ? parseInt(parts[0]) : null;
          const mileageText = parts[1] || '';
          const location = parts[2] || parts[1] || '';

          if (link && title) {
            const href = link.getAttribute('href');
            items.push({
              url: href?.startsWith('http') ? href : `https://www.bytbil.com${href}`,
              title,
              priceText,
              location,
              image,
              source_listing_id: modelId,
              specifications: { miltal: mileageText, år: year ? String(year) : null }
            });
          }
        } catch (err) {
          console.error('Error extracting listing', err);
        }
      });

      return items;
    });

    listings.push(...pageListings);

  } catch (error) {
    logger.error('Error scraping Bytbil URL', { url, error: error.message });
  } finally {
    if (!pageClosed) {
      await page.close().catch(() => {}); // swallow double-close errors
    }
  }

  return listings;
}

/**
 * Fetch detailed information from a Bytbil listing page
 */
async function fetchBytbilListingDetails(browser, listingUrl) {
  const page = await browser.newPage();

  try {
    await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const details = await page.evaluate(() => {
      const data = {};

      // Extract specifications
      const specs = {};
      const specElements = document.querySelectorAll('.spec-item, .specification, tr');
      specElements.forEach(el => {
        const label = el.querySelector('.label, td:first-child')?.textContent?.trim();
        const value = el.querySelector('.value, td:last-child')?.textContent?.trim();
        if (label && value) {
          specs[label.toLowerCase()] = value;
        }
      });

      // Extract description
      data.description = document.querySelector('.description, .car-description, [data-description]')?.textContent?.trim();

      // Extract images (check both src and data-src for lazy loading)
      const images = [];
      document.querySelectorAll('.gallery img, .images img, [data-image], .carousel img, img[src], img[data-src]').forEach(img => {
        const url = img.src || img.getAttribute('data-src');
        if (url) images.push(url);
      });
      data.images = images;

      // Bytbil is typically dealer-focused
      data.sellerType = 'dealer';

      return { ...data, specifications: specs };
    });

    return details;

  } catch (error) {
    await page.close();
    const is404 = error.message?.includes('404') || error.message?.includes('net::ERR_ABORTED');
    if (is404) {
      logger.info('Bytbil detail 404 — listing deleted, skipping scrape.do', { url: listingUrl });
      return null;
    }
    logger.warn('Puppeteer failed for Bytbil detail, trying scrape.do', { url: listingUrl, error: error.message });
    return fetchBytbilDetailViaScraper(listingUrl);
  }
}

async function scrapeBytbilSearchViaScraper(url, maxPages) {
  if (!isScrapeDoAvailable()) return [];
  try {
    // Bytbil is an SPA — always requires render:true
    const html = await fetchViaScrapeDo(url, { render: true, customWait: 3000, geoCode: 'se' });
    const total = parseSiteTotalFromHtml(html);
    if (total != null && total > 0) {
      await supabase
        .from('source_site_totals')
        .upsert(
          { source_platform: 'bytbil', total_available: total, last_updated: new Date().toISOString() },
          { onConflict: 'source_platform' }
        );
      logger.info('Bytbil site total persisted from scrape.do', { total });
    }
    const $ = cheerio.load(html);
    const items = [];

    $('.result-thumbs-item').each((_, card) => {
      const $card = $(card);
      const link = $card.find('a.js-link-target').first();
      const href = link.attr('href');
      if (!href) return;
      const cardUrl = href.startsWith('http') ? href : `https://www.bytbil.com${href}`;

      const title = $card.find('h3').first().text().trim();
      if (!title) return;

      const priceText = $card.find('.car-price-main').first().text().trim();
      const image = $card.find('.car-image').attr('data-background') || null;
      const modelId = $card.find('[data-model-id]').first().attr('data-model-id');

      // car-info: "2025 | 45 000 mil | Upplands Väsby"
      const carInfoText = $card.find('.car-info').first().text();
      const parts = carInfoText.split('|').map(s => s.trim()).filter(Boolean);
      const year = parts[0] ? parseInt(parts[0]) : null;
      const mileageText = parts[1] || '';
      const location = parts[2] || '';

      items.push({
        url: cardUrl,
        title,
        priceText,
        location,
        image,
        source_listing_id: modelId,
        specifications: { miltal: mileageText, år: year ? String(year) : null }
      });
    });
    return items;
  } catch (err) {
    logger.warn('scrape.do search fallback failed for Bytbil', { error: err.message });
    return [];
  }
}

/**
 * Fetch Bytbil listing detail via scrape.do (for year enrichment, etc.)
 * @param {string} listingUrl
 * @returns {Promise<{specifications: Object, description?: string, images?: string[]}|null>}
 */
export async function fetchBytbilDetailViaScraper(listingUrl) {
  if (!isScrapeDoAvailable()) return null;
  try {
    const html = await fetchViaScrapeDo(listingUrl, { geoCode: 'se' });
    const $ = cheerio.load(html);
    const data = {};
    const specs = {};

    $('.spec-item, .specification, tr').each((_, el) => {
      const label = $(el).find('.label, td:first-child').first().text().trim();
      const value = $(el).find('.value, td:last-child').first().text().trim();
      if (label && value) specs[label.toLowerCase()] = value;
    });

    data.description = $('.description, .car-description, [data-description]').first().text().trim() || null;

    const images = [];
    $('.gallery img, .images img, .carousel img, img[src]').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src && !src.includes('logo') && !src.includes('icon')) images.push(src);
    });
    data.images = [...new Set(images)];
    data.sellerType = 'dealer';

    return { ...data, specifications: specs };
  } catch (err) {
    logger.warn('scrape.do fallback also failed for Bytbil detail', { url: listingUrl, error: err.message });
    return null;
  }
}

/**
 * Map Bytbil data to listings format and save to database
 */
export function mapBytbilDataToListing(item) {
  const specs = item.specifications || {};

  // Extract brand and model from title
  const titleParts = (item.title || '').split(' ');
  const brand = titleParts[0] || null;
  const model = titleParts.slice(1, 3).join(' ') || null;

  // Extract year — from title first, then specs (Swedish key 'år')
  const yearMatch = (item.title || '').match(/\b(19|20)\d{2}\b/);
  const year = yearMatch
    ? parseInt(yearMatch[0])
    : parseInt(specs['år'] || specs['year'] || specs['modellår'] || '0', 10) || null;

  // Extract price — strip whitespace and non-digit chars (handles "149 900 kr")
  const priceText = (item.priceText || '').replace(/\s/g, '').replace(/[^\d]/g, '');
  const price = priceText ? parseFloat(priceText) : null;

  // Extract mileage — Bytbil uses Swedish "mil" (1 mil = 10 km), convert to km
  const mileageRaw = specs['miltal'] || specs['mileage'] || specs['körsträcka'] || '';
  const mileageNum = mileageRaw ? parseInt(String(mileageRaw).replace(/\s/g, '').replace(/[^\d]/g, ''), 10) : null;
  // If the raw string contains "mil" (Swedish miles), multiply by 10 to get km
  const isSwedesihMil = mileageRaw && /mil/i.test(String(mileageRaw));
  const mileage = mileageNum != null && !isNaN(mileageNum)
    ? (isSwedesihMil ? mileageNum * 10 : mileageNum)
    : null;

  // Extract fuel type (Swedish: 'bränsle', English fallback: 'fuel')
  const fuelType = specs['bränsle'] || specs['fuel'] || specs['drivmedel'] || null;

  // Extract transmission (Swedish: 'växellåda', English fallback)
  const transmission = specs['växellåda'] || specs['transmission'] || specs['växel'] || null;

  // Extract color (Swedish: 'färg')
  const color = specs['färg'] || specs['color'] || specs['kulör'] || item.color || null;

  // Extract doors (Swedish: 'dörrar')
  const doorsRaw = specs['dörrar'] || specs['doors'] || null;
  const doors = doorsRaw ? parseInt(String(doorsRaw).replace(/[^\d]/g, ''), 10) || null : null;

  // Extract power (Swedish: 'motoreffekt' or 'hästkrafter', in hp/ch)
  const powerRaw = specs['motoreffekt'] || specs['hästkrafter'] || specs['effekt'] || specs['power_hp'] || null;
  const powerHp = powerRaw ? parseInt(String(powerRaw).replace(/[^\d]/g, ''), 10) || null : null;

  // Extract category (Swedish: 'karosstyp' or 'karosseri')
  const categoryRaw = specs['karosstyp'] || specs['karosseri'] || specs['biltyp'] || specs['category'] || null;

  return {
    source_platform: 'bytbil',
    source_listing_id: extractListingIdFromUrl(item.url),
    brand: normalizeBrand(brand),
    model: normalizeModel(model),
    year: year ? parseInt(year) : null,
    mileage,
    price,
    currency: 'SEK',
    location_city: extractCity(item.location),
    location_region: extractRegion(item.location),
    location_country: 'SE',
    seller_type: item.sellerType || 'dealer',
    fuel_type: normalizeFuelType(fuelType),
    transmission: normalizeTransmission(transmission),
    color,
    doors,
    power_hp: powerHp,
    category: categoryRaw || null,
    url: item.url,
    images: (item.images && item.images.length > 0) ? item.images : (item.image ? [item.image] : []),
    specifications: specs,
    description: item.description,
    posted_date: null
  };
}

/**
 * Save Bytbil listing to database
 */
async function saveBytbilListing(item) {
  try {
    const listing = mapBytbilDataToListing(item);

    if (!listing.brand || !listing.model || !listing.price) {
      logger.debug('Skipping Bytbil listing - missing required fields', { listing });
      return false;
    }

    // Check if listing already exists
    const { data: existing } = await supabase
      .from('listings')
      .select('id')
      .eq('source_platform', 'bytbil')
      .eq('source_listing_id', listing.source_listing_id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('listings')
        .update({
          ...listing,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        logger.error('Error updating Bytbil listing', { error: error.message });
        return false;
      }
      return true;
    } else {
      const { error } = await supabase
        .from('listings')
        .insert({
          ...listing,
          status: 'active',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString()
        });

      if (error) {
        logger.error('Error inserting Bytbil listing', { error: error.message });
        return false;
      }
      return true;
    }
  } catch (error) {
    logger.error('Error saving Bytbil listing', { error: error.message });
    return false;
  }
}

// Helper functions (same as Blocket and Bilweb)
function extractListingIdFromUrl(url) {
  const match = url.match(/\/bil\/(\d+)/) || url.match(/\/car\/(\d+)/);
  return match ? match[1] : url.split('/').pop();
}

function extractCity(location) {
  if (!location) return null;
  return location.split(',')[0]?.trim() || location.trim();
}

function extractRegion(location) {
  if (!location) return null;
  const parts = location.split(',');
  return parts.length > 1 ? parts[1]?.trim() : null;
}

function normalizeBrand(brand) {
  if (!brand) return null;
  const brandMap = {
    'mercedes': 'Mercedes-Benz',
    'mercedes-benz': 'Mercedes-Benz',
    'mb': 'Mercedes-Benz',
    'bmw': 'BMW',
    'vw': 'Volkswagen',
    'volvo': 'Volvo',
    'saab': 'Saab'
  };
  return brandMap[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
}

function normalizeModel(model) {
  if (!model) return null;
  return model.trim();
}

function normalizeFuelType(fuelType) {
  if (!fuelType) return null;
  const fuelMap = {
    'bensin': 'petrol',
    'diesel': 'diesel',
    'el': 'electric',
    'hybrid': 'hybrid',
    'plug-in hybrid': 'plug-in hybrid'
  };
  return fuelMap[fuelType.toLowerCase()] || fuelType.toLowerCase();
}

function normalizeTransmission(transmission) {
  if (!transmission) return null;
  const transMap = {
    'manuell': 'manual',
    'automat': 'automatic',
    'cvt': 'cvt'
  };
  return transMap[transmission.toLowerCase()] || transmission.toLowerCase();
}
