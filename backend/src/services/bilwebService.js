import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { fetchViaScrapeDo, isScrapeDoAvailable } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import { launchBrowser } from '../utils/puppeteerLaunch.js';

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
          const listings = await scrapeBilwebViaScrapeDo(searchUrl, options.maxPages || 50);
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
      browser = await launchBrowser({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu']
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

// Swedish county slug → region name
const COUNTY_TO_REGION = {
  'stockholms-lan': 'Stockholm',
  'vastra-gotalands-lan': 'Västra Götaland',
  'skane-lan': 'Skåne',
  'ostergotlands-lan': 'Östergötland',
  'jonkopings-lan': 'Jönköping',
  'kronobergs-lan': 'Kronoberg',
  'kalmar-lan': 'Kalmar',
  'gotlands-lan': 'Gotland',
  'blekinge-lan': 'Blekinge',
  'hallands-lan': 'Halland',
  'varmlands-lan': 'Värmland',
  'orebro-lan': 'Örebro',
  'vastmanlands-lan': 'Västmanland',
  'dalarnas-lan': 'Dalarna',
  'gavleborgs-lan': 'Gävleborg',
  'vasternorrlands-lan': 'Västernorrland',
  'jamtlands-lan': 'Jämtland',
  'vasterbottens-lan': 'Västerbotten',
  'norrbottens-lan': 'Norrbotten',
  'sodermanlands-lan': 'Södermanland',
  'uppsala-lan': 'Uppsala',
};

/**
 * Scrape Bilweb via scrape.do
 * Bilweb is an SPA — pagination uses ?offset=N&limit=30 (not ?sida=N which is ignored server-side).
 * Each page HTML has 60 Card-Wrapper elements but only 30 unique listings (each card duplicated in DOM).
 * Card selector: .Card-Wrapper > .Card[id]
 */
async function scrapeBilwebViaScrapeDo(baseUrl, maxPages = 50) {
  const listings = [];
  const seen = new Set();
  const PAGE_SIZE = 30;

  // Normalise base URL: strip www (bilweb.se → no redirect), use /sok
  const sokBase = baseUrl
    .replace(/^https?:\/\/www\.bilweb\.se/, 'https://bilweb.se')
    .replace(/\/$/, '')
    .replace(/\/bilar$/, '/sok');

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    const offset = pageNum * PAGE_SIZE;
    const url = `${sokBase}?offset=${offset}&limit=${PAGE_SIZE}&order_by=timestamp&order=desc`;

    let html;
    try {
      // render: true needed — bilweb blocks plain proxy IPs (same as blocket.se)
      html = await fetchViaScrapeDo(url, { render: true, customWait: 3000, geoCode: 'se', retries: 1 });
    } catch (err) {
      logger.warn('Bilweb scrape.do fetch failed', { page: pageNum, error: err.message });
      break;
    }

    const $ = cheerio.load(html);
    const cards = $('.Card-Wrapper');

    if (cards.length === 0) {
      logger.info('Bilweb: no cards found, stopping', { page: pageNum });
      break;
    }

    const pageListings = [];
    cards.each((_, el) => {
      const $card = $(el);
      const $inner = $card.find('.Card').first();
      const listingId = $inner.attr('id');
      if (!listingId || seen.has(listingId)) return;
      seen.add(listingId);

      const $link = $card.find('a.go_to_detail').first();
      const cardUrl = $link.attr('href');
      if (!cardUrl) return;

      const title = $link.text().trim();
      const priceText = $card.find('.Card-mainPrice').first().text().trim();
      const dealer = $card.find('.Card-firm').first().text().replace(/\s+/g, ' ').trim().split('\n')[0].trim();
      const image = $card.find('.Card-image img').attr('data-src') || $card.find('.Card-image img').attr('src') || null;

      // Parse Card-carData dt/dd pairs
      const specs = {};
      const $dl = $card.find('.Card-carData').first();
      $dl.find('dt').each((i, dt) => {
        const key = $(dt).text().trim().toLowerCase().replace(':', '');
        const $dd = $dl.find('dd').eq(i);
        if (key === 'drivmedel') {
          // Fuel type is encoded as an icon class: Icon--diesel, Icon--bensin, Icon--el, etc.
          const iconClass = $dd.find('[class*="Icon--"]').attr('class') || '';
          const m = iconClass.match(/Icon--(\w+)/);
          specs[key] = m ? m[1] : $dd.text().trim();
        } else {
          specs[key] = $dd.text().trim();
        }
      });

      // Extract county from URL path for region mapping
      const countyMatch = cardUrl.match(/bilweb\.se\/([^/]+)\//);
      const county = countyMatch ? countyMatch[1] : null;

      pageListings.push({ url: cardUrl, listingId, title, priceText, dealer, image, specs, county });
    });

    listings.push(...pageListings);
    logger.info('Bilweb page scraped', { page: pageNum, count: pageListings.length });

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
  // Title: "Volvo V60 D3 Momentum" → brand=Volvo, model=V60
  const titleParts = (item.title || '').split(/\s+/);
  const brand = titleParts[0] || null;
  const model = titleParts[1] || null;

  // Year: from new specs.år or legacy specifications
  const yearRaw = item.specs?.['år'] || item.specifications?.['år'] || item.specifications?.['year'];
  const year = yearRaw ? parseInt(yearRaw) : null;

  // Price: "159 000 kr" → 159000
  const priceStr = (item.priceText || '').replace(/\s/g, '').replace(/[^\d]/g, '');
  const price = priceStr ? parseFloat(priceStr) : null;

  // Mileage: bilweb shows "mil" (Swedish mil = 10 km) → convert to km
  const milText = item.specs?.['mil'] || item.specifications?.['miltal'] || item.specifications?.['mileage'] || '';
  const milRaw = milText ? parseInt(milText.replace(/\s/g, '').replace(/[^\d]/g, '')) : null;
  const mileage = milRaw != null && !isNaN(milRaw) ? milRaw * 10 : null;

  // Fuel type from icon slug (diesel, bensin, el, hybrid, gas) or legacy specs
  const fuelRaw = item.specs?.['drivmedel'] || item.specifications?.['bränsle'] || item.specifications?.['fuel'] || null;

  // Transmission from specs
  const transRaw = item.specs?.['växellåda'] || item.specifications?.['växellåda'] || item.specifications?.['transmission'] || null;

  // Location from county slug
  const county = item.county || null;
  const location_region = COUNTY_TO_REGION[county] || null;

  return {
    source_platform: 'bilweb',
    source_listing_id: item.listingId || extractListingIdFromUrl(item.url),
    brand: normalizeBrand(brand),
    model: normalizeModel(model),
    year,
    mileage,
    price,
    currency: 'SEK',
    location_city: null,
    location_region,
    location_country: 'SE',
    seller_type: item.dealer ? 'dealer' : (item.sellerType || null),
    fuel_type: normalizeFuelType(fuelRaw),
    transmission: normalizeTransmission(transRaw),
    url: item.url,
    images: item.image ? [item.image] : (item.images || []),
    specifications: item.specs || item.specifications || {},
    description: item.description || null,
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
    'bensin': 'PETROL',
    'gasoline': 'PETROL',
    'diesel': 'DIESEL',
    'el': 'ELECTRIC',
    'electric': 'ELECTRIC',
    'hybrid': 'HYBRID',
    'plug-in hybrid': 'HYBRID',
    'laddhybrid': 'HYBRID',
    'gas': 'GAS',
    'etanol': 'GAS',
  };
  return fuelMap[fuelType.toLowerCase()] || fuelType.toUpperCase();
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
