import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { fetchViaScrapeDo, isScrapeDoAvailable } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

/**
 * Run Bilweb.se scraper and save results to database
 * Bilweb.se is one of Sweden's largest car marketplaces
 */
export async function runBilwebScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = {
    totalScraped: 0,
    saved: 0,
    errors: 0,
    processedUrls: []
  };

  try {
    const useScrapeDo = isScrapeDoAvailable();

    if (useScrapeDo) {
      logger.info('Starting Bilweb.se scraper (scrape.do first)', { searchUrls, options });
      const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];
      for (const searchUrl of urls) {
        try {
          const listings = await scrapeBilwebViaScrapeDo(searchUrl, options.maxPages || 10);
          if (listings.length > 0) {
            await saveRawListings(listings, 'bilweb');
            for (const listing of listings) {
              try {
                const saved = await saveBilwebListing(listing);
                if (saved) results.saved++;
              } catch { /* skip */ }
              results.totalScraped++;
            }
          }
          results.processedUrls.push(searchUrl);
        } catch (err) {
          logger.error('Error scraping Bilweb URL', { url: searchUrl, error: err.message });
          results.errors++;
        }
      }
      return results;
    }

    logger.info('Starting Bilweb.se scraper', { searchUrls, options });

    try {
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
    } catch (launchErr) {
      throw launchErr;
    }

    for (const searchUrl of searchUrls) {
      try {
        logger.info('Scraping Bilweb.se URL', { url: searchUrl });

        let listings = [];
        try {
          listings = await scrapeBilwebUrl(browser, searchUrl, options.maxPages || 10);
        } catch (err) {
          logger.warn('Bilweb Puppeteer failed, trying scrape.do', { error: err.message });
          if (isScrapeDoAvailable()) {
            listings = await scrapeBilwebViaScrapeDo(searchUrl, options.maxPages || 10);
          } else {
            throw err;
          }
        }

        logger.info('Bilweb.se scraping completed', {
          url: searchUrl,
          listingsFound: listings.length
        });

        // Stage 1: Store raw scraped data as-is
        try {
          await saveRawListings(listings, 'bilweb');
        } catch (rawErr) {
          logger.warn('Raw listing save failed', { error: rawErr.message });
        }

        // Stage 2: Map and save to listings
        for (const listing of listings) {
          try {
            const saved = await saveBilwebListing(listing);
            if (saved) {
              results.saved++;
            }
            results.totalScraped++;
          } catch (error) {
            logger.warn('Error saving Bilweb listing', { error: error.message, listing });
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
        logger.error('Error scraping Bilweb URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('Bilweb.se scraper completed', results);
    return results;

  } catch (error) {
    logger.error('Error in Bilweb.se scraper', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape Bilweb via scrape.do when Puppeteer fails (anti-bot fallback)
 */
async function scrapeBilwebViaScrapeDo(baseUrl, maxPages = 10) {
  const listings = [];
  const seen = new Set();

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = pageNum === 1 ? baseUrl : (baseUrl + (baseUrl.includes('?') ? '&' : '?') + `page=${pageNum}`);

    let html;
    try {
      html = await fetchViaScrapeDo(url, { render: true, customWait: 4000, geoCode: 'se' });
    } catch (err) {
      logger.warn('Bilweb scrape.do fetch failed', { page: pageNum, error: err.message });
      break;
    }

    const $ = cheerio.load(html);
    const cards = $('a[href*="/bil/"], a[href*="/vehicle/"]').closest('.vehicle-item, .car-item, [data-vehicle], article, .listing-card, li');
    const items = cards.length ? cards : $('a[href*="/bil/"], a[href*="/vehicle/"]');

    const pageListings = [];
    items.each((_, el) => {
      const $el = $(el);
      const link = $el.find('a[href*="/bil/"], a[href*="/vehicle/"]').first().attr('href') || $el.attr('href');
      if (!link) return;
      const fullUrl = link.startsWith('http') ? link : `https://www.bilweb.se${link}`;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);

      const title = $el.find('.title, .vehicle-title, h2, h3').first().text().trim() || $el.text().trim().substring(0, 100);
      const priceText = $el.find('.price, .vehicle-price, [data-price]').first().text().trim();
      const image = $el.find('img').first().attr('src');
      pageListings.push({ url: fullUrl, title, priceText, location: null, image });
    });

    if (pageListings.length === 0 && pageNum === 1) {
      $('a[href*="/bil/"], a[href*="/vehicle/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const fullUrl = href.startsWith('http') ? href : `https://www.bilweb.se${href}`;
        if (seen.has(fullUrl)) return;
        seen.add(fullUrl);
        const card = $(el).closest('article, li, .card, [class*="listing"]');
        const title = card.find('h2, h3, .title').first().text().trim() || $(el).text().trim().substring(0, 80);
        pageListings.push({ url: fullUrl, title, priceText: card.find('[class*="price"]').text().trim(), location: null, image: null });
      });
    }

    for (const item of pageListings) {
      try {
        const detailHtml = await fetchViaScrapeDo(item.url, { geoCode: 'se' });
        const $d = cheerio.load(detailHtml);
        const specs = {};
        $d('.spec-row, .specification-row, tr').each((_, row) => {
          const label = $d(row).find('td:first-child, .label').first().text().trim().toLowerCase();
          const value = $d(row).find('td:last-child, .value').last().text().trim();
          if (label && value) specs[label] = value;
        });
        const details = {
          specifications: specs,
          description: $d('.description, .vehicle-description, [data-description]').first().text().trim() || null,
          images: $d('.gallery img, .images img, [data-image]').map((_, img) => $d(img).attr('src')).get().filter(Boolean)
        };
        listings.push({ ...item, ...details });
      } catch (err) {
        logger.warn('Bilweb detail fetch failed', { url: item.url });
        listings.push(item);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (pageListings.length === 0) break;
    await new Promise(r => setTimeout(r, 1500));
  }

  return listings;
}

/**
 * Scrape a single Bilweb.se search URL
 */
async function scrapeBilwebUrl(browser, url, maxPages = 10) {
  const page = await browser.newPage();
  const listings = [];

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for listings to load
    await page.waitForSelector('.vehicle-item, .car-item, [data-vehicle]', { timeout: 10000 }).catch(() => {
      logger.warn('No listings found on Bilweb page', { url });
    });

    // Extract listings from current page
    const pageListings = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.vehicle-item, .car-item, [data-vehicle]');

      cards.forEach(card => {
        try {
          const link = card.querySelector('a[href*="/bil/"], a[href*="/vehicle/"]');
          const title = card.querySelector('.title, .vehicle-title, h2, h3')?.textContent?.trim();
          const priceText = card.querySelector('.price, .vehicle-price, [data-price]')?.textContent?.trim();
          const location = card.querySelector('.location, .dealer-location, .city')?.textContent?.trim();
          const image = card.querySelector('img')?.src;

          if (link && title) {
            items.push({
              url: link.href.startsWith('http') ? link.href : `https://www.bilweb.se${link.href}`,
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
        const details = await fetchBilwebListingDetails(browser, item.url);
        if (details) {
          listings.push({
            ...item,
            ...details
          });
        }
      } catch (error) {
        logger.warn('Error fetching Bilweb listing details', { url: item.url, error: error.message });
        listings.push(item);
      }
    }

  } catch (error) {
    logger.error('Error scraping Bilweb URL', { url, error: error.message });
  } finally {
    await page.close();
  }

  return listings;
}

/**
 * Fetch detailed information from a Bilweb listing page
 */
async function fetchBilwebListingDetails(browser, listingUrl) {
  const page = await browser.newPage();

  try {
    await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const details = await page.evaluate(() => {
      const data = {};

      // Extract specifications table
      const specs = {};
      const specRows = document.querySelectorAll('.spec-row, .specification-row, tr');
      specRows.forEach(row => {
        const label = row.querySelector('td:first-child, .label, .spec-label')?.textContent?.trim();
        const value = row.querySelector('td:last-child, .value, .spec-value')?.textContent?.trim();
        if (label && value) {
          specs[label.toLowerCase()] = value;
        }
      });

      // Extract description
      data.description = document.querySelector('.description, .vehicle-description, [data-description]')?.textContent?.trim();

      // Extract images
      const images = [];
      document.querySelectorAll('.gallery img, .images img, [data-image]').forEach(img => {
        if (img.src) images.push(img.src);
      });
      data.images = images;

      // Bilweb is typically dealer-focused
      data.sellerType = 'dealer';

      return { ...data, specifications: specs };
    });

    return details;

  } catch (error) {
    logger.warn('Error fetching Bilweb listing details', { url: listingUrl, error: error.message });
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Map Bilweb data to listings format and save to database
 * Exported for rawListingsProcessorService
 */
export function mapBilwebDataToListing(item) {
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
    source_platform: 'bilweb',
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
 * Save Bilweb listing to database
 */
async function saveBilwebListing(item) {
  try {
    const listing = mapBilwebDataToListing(item);

    if (!listing.brand || !listing.model || !listing.price) {
      logger.debug('Skipping Bilweb listing - missing required fields', { listing });
      return false;
    }

    // Check if listing already exists
    const { data: existing } = await supabase
      .from('listings')
      .select('id')
      .eq('source_platform', 'bilweb')
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
        logger.error('Error updating Bilweb listing', { error: error.message });
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
        logger.error('Error inserting Bilweb listing', { error: error.message });
        return false;
      }
      return true;
    }
  } catch (error) {
    logger.error('Error saving Bilweb listing', { error: error.message });
    return false;
  }
}

// Helper functions (same as Blocket)
function extractListingIdFromUrl(url) {
  const match = url.match(/\/bil\/(\d+)/) || url.match(/\/vehicle\/(\d+)/);
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
