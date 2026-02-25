import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

/**
 * Run Blocket.se scraper and save results to database
 * Blocket.se is Sweden's largest classified ads platform (similar to Leboncoin)
 */
export async function runBlocketScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = {
    totalScraped: 0,
    saved: 0,
    errors: 0,
    processedUrls: []
  };

  try {
    logger.info('Starting Blocket.se scraper', { searchUrls, options });

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

    for (const searchUrl of searchUrls) {
      try {
        logger.info('Scraping Blocket.se URL', { url: searchUrl });

        const listings = await scrapeBlocketUrl(browser, searchUrl, options.maxPages || 10);

        logger.info('Blocket.se scraping completed', {
          url: searchUrl,
          listingsFound: listings.length
        });

        // Stage 1: Store raw scraped data as-is
        try {
          await saveRawListings(listings, 'blocket');
        } catch (rawErr) {
          logger.warn('Raw listing save failed', { error: rawErr.message });
        }

        // Stage 2: Map and save to listings
        for (const listing of listings) {
          try {
            const saved = await saveBlocketListing(listing);
            if (saved) {
              results.saved++;
            }
            results.totalScraped++;
          } catch (error) {
            logger.warn('Error saving Blocket listing', { error: error.message, listing });
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
        logger.error('Error scraping Blocket URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('Blocket.se scraper completed', results);
    return results;

  } catch (error) {
    logger.error('Error in Blocket.se scraper', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape a single Blocket.se search URL
 */
async function scrapeBlocketUrl(browser, url, maxPages = 10) {
  const page = await browser.newPage();
  const listings = [];

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent and headers to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.blocket.se/'
    });
    
    logger.info('Navigating to Blocket URL', { url });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait a bit for dynamic content to load
    await page.waitForTimeout(5000);
    
    // Debug: Get page title and URL to verify we're on the right page
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyTextLength: document.body?.textContent?.length || 0
    }));
    logger.info('Blocket page loaded', pageInfo);

    // Try multiple selectors for different Blocket.se page formats
    // New format: /mobility/search/car uses different selectors
    // Old format: /annonser/ uses .styled__AdCardContainer
    let listingsFound = false;
    
    try {
      // Try new format selectors first
      await page.waitForSelector('[data-testid="ad-card"], .ad-card, article[class*="AdCard"], [class*="ListingCard"]', { timeout: 10000 });
      listingsFound = true;
    } catch (e) {
      try {
        // Try old format selectors
        await page.waitForSelector('.styled__AdCardContainer, [class*="AdCardContainer"]', { timeout: 5000 });
        listingsFound = true;
      } catch (e2) {
        logger.warn('No listings found on Blocket page - trying to extract anyway', { url });
      }
    }

    // Extract listings from current page
    const pageListings = await page.evaluate(() => {
      const items = [];
      
      // Debug: Log page structure
      const debugInfo = {
        bodyText: document.body?.textContent?.substring(0, 500),
        allLinks: document.querySelectorAll('a').length,
        allDivs: document.querySelectorAll('div').length,
        allArticles: document.querySelectorAll('article').length,
        pageTitle: document.title,
        url: window.location.href,
        hasBlocketContent: document.body?.textContent?.includes('blocket') || document.body?.textContent?.includes('annons'),
        hasNoResults: document.body?.textContent?.includes('Inga resultat') || document.body?.textContent?.includes('inga annonser')
      };
      console.log('Blocket page structure:', debugInfo);
      
      // Try multiple selector strategies for different Blocket formats
      const selectors = [
        '[data-testid="ad-card"]',
        '.ad-card',
        'article[class*="AdCard"]',
        '[class*="ListingCard"]',
        '.styled__AdCardContainer',
        '[class*="AdCardContainer"]',
        'a[href*="/annonser/"]',
        'a[href*="/mobility/"]',
        'a[href*="/annonser/hela_sverige/fordon/bilar"]',
        '[class*="SearchResult"]',
        '[class*="AdItem"]',
        'div[class*="ad"]',
        'div[class*="listing"]'
      ];
      
      let cards = [];
      let usedSelector = null;
      for (const selector of selectors) {
        cards = document.querySelectorAll(selector);
        if (cards.length > 0) {
          console.log(`Found ${cards.length} cards with selector: ${selector}`);
          usedSelector = selector;
          break;
        }
      }
      
      // If no cards found, try to find ANY links that might be listings
      if (cards.length === 0) {
        const allLinks = document.querySelectorAll('a[href*="/annonser/"], a[href*="/mobility/"]');
        console.log(`Found ${allLinks.length} potential listing links`);
        if (allLinks.length > 0) {
          // Return debug info
          return { debug: debugInfo, listings: [], usedSelector: null, allLinksCount: allLinks.length };
        }
      }
      
      // If still no cards, return debug info
      if (cards.length === 0) {
        return { debug: debugInfo, listings: [], usedSelector: null };
      }

      cards.forEach((card, index) => {
        try {
          // Find link - try multiple strategies
          let link = card.querySelector('a[href*="/annonser/"]') || 
                     card.querySelector('a[href*="/mobility/"]') ||
                     card.querySelector('a[href]') ||
                     (card.tagName === 'A' ? card : null);
          
          // If card itself is a link
          if (!link && card.href) {
            link = card;
          }
          
          // Find title - try multiple strategies
          const title = card.querySelector('h2, h3, [data-testid="ad-title"], .ad-title, [class*="Title"], [class*="title"]')?.textContent?.trim() ||
                       card.querySelector('a')?.textContent?.trim() ||
                       card.getAttribute('aria-label')?.trim();
          
          // Find price - try multiple strategies
          const priceText = card.querySelector('[data-testid="ad-price"], .ad-price, [class*="Price"], [class*="price"], .price')?.textContent?.trim() ||
                           card.textContent.match(/[\d\s]+kr/i)?.[0];
          
          // Find location
          const location = card.querySelector('[data-testid="ad-location"], .ad-location, [class*="Location"], [class*="location"]')?.textContent?.trim();
          
          // Find image
          const image = card.querySelector('img')?.src || card.querySelector('img')?.getAttribute('data-src');

          if (link && title) {
            const href = link.href || link.getAttribute('href');
            if (href) {
              items.push({
                url: href.startsWith('http') ? href : `https://www.blocket.se${href}`,
                title,
                priceText,
                location,
                image
              });
            }
          }
        } catch (err) {
          console.error('Error extracting listing', err);
        }
      });

      return { debug: null, listings: items, usedSelector };
    });

    // Handle debug response
    if (pageListings.debug) {
      logger.warn('Blocket page debug info', {
        url,
        debug: pageListings.debug,
        usedSelector: pageListings.usedSelector,
        allLinksCount: pageListings.allLinksCount,
        listingsFound: pageListings.listings?.length || 0
      });
      
      // If we have debug info but no listings, try a different approach
      if (pageListings.listings.length === 0) {
        logger.warn('No listings found with selectors, trying alternative approach', { url });
        // Try to extract from all links on the page
        const alternativeListings = await page.evaluate(() => {
          const items = [];
          const links = document.querySelectorAll('a[href*="/annonser/"], a[href*="/mobility/"]');
          links.forEach(link => {
            const href = link.href || link.getAttribute('href');
            const title = link.textContent?.trim() || link.getAttribute('aria-label') || '';
            if (href && title && title.length > 5) {
              items.push({
                url: href.startsWith('http') ? href : `https://www.blocket.se${href}`,
                title,
                priceText: null,
                location: null,
                image: null
              });
            }
          });
          return items;
        });
        
        if (alternativeListings.length > 0) {
          logger.info('Found listings using alternative approach', { count: alternativeListings.length });
          pageListings.listings = alternativeListings;
        }
      }
    }

    const listings = pageListings.listings || pageListings;
    
    logger.info('Extracted listings from Blocket page', { 
      url, 
      listingsCount: listings.length,
      usedSelector: pageListings.usedSelector,
      sampleListings: listings.slice(0, 3).map(l => ({ title: l.title, url: l.url }))
    });

    // Fetch details for each listing
    for (const item of listings) {
      try {
        const details = await fetchBlocketListingDetails(browser, item.url);
        if (details) {
          listings.push({
            ...item,
            ...details
          });
        }
      } catch (error) {
        logger.warn('Error fetching Blocket listing details', { url: item.url, error: error.message });
        // Still add basic listing
        listings.push(item);
      }
    }

  } catch (error) {
    logger.error('Error scraping Blocket URL', { url, error: error.message });
  } finally {
    await page.close();
  }

  return listings;
}

/**
 * Fetch detailed information from a Blocket listing page
 */
async function fetchBlocketListingDetails(browser, listingUrl) {
  const page = await browser.newPage();

  try {
    await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const details = await page.evaluate(() => {
      const data = {};

      // Extract specifications
      const specs = {};
      const specElements = document.querySelectorAll('[data-testid="ad-spec"], .ad-spec, .spec-item');
      specElements.forEach(el => {
        const label = el.querySelector('.label, .spec-label')?.textContent?.trim();
        const value = el.querySelector('.value, .spec-value')?.textContent?.trim();
        if (label && value) {
          specs[label.toLowerCase()] = value;
        }
      });

      // Extract description
      data.description = document.querySelector('[data-testid="ad-description"], .ad-description, .description')?.textContent?.trim();

      // Extract images
      const images = [];
      document.querySelectorAll('[data-testid="ad-image"], .ad-image img, .gallery img').forEach(img => {
        if (img.src) images.push(img.src);
      });
      data.images = images;

      // Extract seller info
      data.sellerType = document.querySelector('[data-testid="dealer-badge"]') ? 'dealer' : 'private';

      return { ...data, specifications: specs };
    });

    return details;

  } catch (error) {
    logger.warn('Error fetching Blocket listing details', { url: listingUrl, error: error.message });
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Map Blocket data to listings format and save to database
 * Exported for rawListingsProcessorService
 */
export function mapBlocketDataToListing(item) {
  // Extract brand and model from title
  const titleParts = (item.title || '').split(' ');
  const brand = titleParts[0] || null;
  const model = titleParts.slice(1, 3).join(' ') || null;

  // Extract year from title or specs
  const yearMatch = (item.title || '').match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : null;

  // Extract price (remove spaces and "kr" or "SEK")
  const priceText = (item.priceText || '').replace(/\s/g, '').replace(/[^\d]/g, '');
  const price = priceText ? parseFloat(priceText) : null;

  // Extract mileage from specifications
  const mileageText = item.specifications?.['miltal'] || item.specifications?.['mileage'] || '';
  const mileage = mileageText ? parseInt(mileageText.replace(/\s/g, '').replace(/[^\d]/g, '')) : null;

  // Extract fuel type
  const fuelType = item.specifications?.['bränsle'] || item.specifications?.['fuel'] || null;

  // Extract transmission
  const transmission = item.specifications?.['växellåda'] || item.specifications?.['transmission'] || null;

  return {
    source_platform: 'blocket',
    source_listing_id: extractListingIdFromUrl(item.url),
    brand: normalizeBrand(brand),
    model: normalizeModel(model),
    year,
    mileage,
    price,
    currency: 'SEK',
    location_city: extractCity(item.location),
    location_region: extractRegion(item.location),
    location_country: 'SE',
    seller_type: item.sellerType || 'private',
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
 * Save Blocket listing to database
 */
async function saveBlocketListing(item) {
  try {
    const listing = mapBlocketDataToListing(item);

    if (!listing.brand || !listing.model || !listing.price) {
      logger.debug('Skipping Blocket listing - missing required fields', { listing });
      return false;
    }

    // Check if listing already exists
    const { data: existing } = await supabase
      .from('listings')
      .select('id')
      .eq('source_platform', 'blocket')
      .eq('source_listing_id', listing.source_listing_id)
      .single();

    if (existing) {
      // Update existing listing
      const { error } = await supabase
        .from('listings')
        .update({
          ...listing,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        logger.error('Error updating Blocket listing', { error: error.message });
        return false;
      }

      return true;
    } else {
      // Insert new listing
      const { error } = await supabase
        .from('listings')
        .insert({
          ...listing,
          status: 'active',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString()
        });

      if (error) {
        logger.error('Error inserting Blocket listing', { error: error.message });
        return false;
      }

      return true;
    }
  } catch (error) {
    logger.error('Error saving Blocket listing', { error: error.message });
    return false;
  }
}

// Helper functions
function extractListingIdFromUrl(url) {
  const match = url.match(/\/annonser\/[^\/]+\/(\d+)/);
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
