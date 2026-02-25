import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

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

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    for (const searchUrl of searchUrls) {
      try {
        logger.info('Scraping Bytbil.com URL', { url: searchUrl });

        const listings = await scrapeBytbilUrl(browser, searchUrl, options.maxPages || 10);

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

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for listings to load
    await page.waitForSelector('.car-card, .vehicle-card, .listing-item', { timeout: 10000 }).catch(() => {
      logger.warn('No listings found on Bytbil page', { url });
    });

    // Extract listings from current page
    const pageListings = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.car-card, .vehicle-card, .listing-item');

      cards.forEach(card => {
        try {
          const link = card.querySelector('a[href*="/bil/"], a[href*="/car/"]');
          const title = card.querySelector('.title, .car-title, h2, h3')?.textContent?.trim();
          const priceText = card.querySelector('.price, .car-price, [data-price]')?.textContent?.trim();
          const location = card.querySelector('.location, .dealer-location, .city')?.textContent?.trim();
          const img = card.querySelector('img');
          const image = img?.src || img?.getAttribute('data-src');

          if (link && title) {
            items.push({
              url: link.href.startsWith('http') ? link.href : `https://www.bytbil.com${link.href}`,
              title,
              priceText,
              location,
              image
            });
          }
        } catch (err) {
          console.error('Error extracting listing', err);
        }
      });

      return items;
    });

    // Fetch details for each listing
    for (const item of pageListings) {
      try {
        const details = await fetchBytbilListingDetails(browser, item.url);
        if (details) {
          listings.push({
            ...item,
            ...details
          });
        }
      } catch (error) {
        logger.warn('Error fetching Bytbil listing details', { url: item.url, error: error.message });
        listings.push(item);
      }
    }

  } catch (error) {
    logger.error('Error scraping Bytbil URL', { url, error: error.message });
  } finally {
    await page.close();
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
    logger.warn('Error fetching Bytbil listing details', { url: listingUrl, error: error.message });
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Map Bytbil data to listings format and save to database
 */
export function mapBytbilDataToListing(item) {
  // Extract brand and model from title
  const titleParts = (item.title || '').split(' ');
  const brand = titleParts[0] || null;
  const model = titleParts.slice(1, 3).join(' ') || null;

  // Extract year
  const yearMatch = (item.title || '').match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : (item.specifications?.['år'] || item.specifications?.['year']);

  // Extract price
  const priceText = (item.priceText || '').replace(/\s/g, '').replace(/[^\d]/g, '');
  const price = priceText ? parseFloat(priceText) : null;

  // Extract mileage
  const mileageText = item.specifications?.['miltal'] || item.specifications?.['mileage'] || '';
  const mileage = mileageText ? parseInt(mileageText.replace(/\s/g, '').replace(/[^\d]/g, '')) : null;

  // Extract fuel type
  const fuelType = item.specifications?.['bränsle'] || item.specifications?.['fuel'] || null;

  // Extract transmission
  const transmission = item.specifications?.['växellåda'] || item.specifications?.['transmission'] || null;

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
    url: item.url,
    images: (item.images && item.images.length > 0) ? item.images : (item.image ? [item.image] : []),
    specifications: item.specifications || {},
    description: item.description,
    posted_date: new Date().toISOString()
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
