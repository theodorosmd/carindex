import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const SOURCE_PLATFORM = 'mobile.de';

/**
 * Run mobile.de scraper (Puppeteer) et envoie vers Ingest API
 * Flux : scrape → raw_listings → processRawListings → listings
 */
export async function runMobileDeScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = {
    totalScraped: 0,
    saved: 0,
    errors: 0,
    processedUrls: []
  };

  try {
    const maxPages = options.maxPages || 10;

    logger.info('Starting mobile.de scraper (Puppeteer)', { searchUrls, options });

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
        logger.info('Scraping mobile.de URL', { url: searchUrl });

        const listings = await scrapeMobileDeUrl(browser, searchUrl, maxPages);

        logger.info('mobile.de scraping completed', {
          url: searchUrl,
          listingsFound: listings.length
        });

        if (listings.length > 0) {
          // Stage 1: raw_listings (pour debugging, re-processing)
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
        logger.error('Error scraping mobile.de URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('mobile.de scraper completed', results);
    return {
      runId: null,
      totalScraped: results.totalScraped,
      saved: results.saved,
      processedUrls: results.processedUrls
    };
  } catch (error) {
    logger.error('Error in mobile.de scraper', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape une URL de recherche mobile.de
 */
async function scrapeMobileDeUrl(browser, url, maxPages = 10) {
  const page = await browser.newPage();
  const allListings = [];

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.mobile.de/'
    });

    let currentPage = 1;

    while (currentPage <= maxPages) {
      const pageUrl = currentPage === 1
        ? url
        : url.includes('?') ? `${url}&pageNumber=${currentPage}` : `${url}?pageNumber=${currentPage}`;

      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000);

      const pageListings = await page.evaluate(() => {
        const items = [];
        const selectors = [
          'a[href*="/fahrzeuge/details/"]',
          '[data-testid*="listing"]',
          '[class*="listing-card"]',
          '[class*="ListingCard"]',
          'article[class*="result"]',
          '[class*="SearchResult"]'
        ];

        let links = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) {
            links = Array.from(found);
            break;
          }
        }

        if (links.length === 0) {
          links = Array.from(document.querySelectorAll('a[href*="/fahrzeuge/details/"]'));
        }

        const seen = new Set();
        links.forEach((el) => {
          const a = el.tagName === 'A' ? el : el.querySelector('a[href*="/fahrzeuge/details/"]');
          if (!a) return;
          const href = a.href || a.getAttribute('href');
          if (!href || seen.has(href)) return;

          const idMatch = href.match(/\/details\/(\d+)/);
          const sourceListingId = idMatch ? idMatch[1] : null;
          if (!sourceListingId) return;
          seen.add(href);

          const card = el.closest('[class*="card"], [class*="result"], [class*="listing"], article') || el;
          const text = card.textContent || '';
          const priceMatch = text.match(/(\d{1,3}(?:\.\d{3})*)\s*€/);
          const kmMatch = text.match(/(\d{1,3}(?:\.\d{3})*)\s*km/i);
          const yearMatch = text.match(/\b(19|20)\d{2}\b/);

          const titleEl = card.querySelector('h2, h3, [class*="title"], [class*="Title"]') || a;
          const title = titleEl?.textContent?.trim() || '';

          const makeModel = title.split(/\s+/);
          const brand = makeModel[0] || null;
          const model = makeModel.slice(1).join(' ') || null;

          items.push({
            url: href.startsWith('http') ? href : `https://www.mobile.de${href}`,
            id: sourceListingId,
            brand,
            model,
            price: priceMatch ? parseInt(priceMatch[1].replace(/\./g, ''), 10) : null,
            mileage: kmMatch ? parseInt(kmMatch[1].replace(/\./g, ''), 10) : null,
            year: yearMatch ? parseInt(yearMatch[0], 10) : null,
            title
          });
        });

        return items;
      });

      const valid = pageListings.filter((i) => i.url && i.id);
      allListings.push(...valid);

      if (valid.length === 0) break;

      logger.info('mobile.de page scraped', { page: currentPage, found: valid.length });
      currentPage++;
    }

    return allListings;
  } finally {
    await page.close();
  }
}

/**
 * Map mobile.de scraper data to our database schema
 * (Utilisé par rawListingsProcessorService et pour l'ingest)
 */
export function mapMobileDeDataToListing(item, sourcePlatform = 'mobile.de') {
  const urlMatch = item.url?.match(/\/details\/(\d+)/);
  const sourceListingId = urlMatch
    ? urlMatch[1]
    : item.ad_id
      ? String(item.ad_id)
      : item.id || item.url;

  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price.value || item.price.amount || item.price.price || 0;
  } else if (typeof item.price === 'string') {
    priceValue = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
  } else {
    priceValue = item.price || item.priceValue || item.priceAmount || item.price_amount || 0;
  }
  const price = parseFloat(priceValue) || 0;

  let mileageValue = item.mileage || item.kilometer || item.km || 0;
  if (typeof mileageValue === 'string') {
    mileageValue = parseInt(mileageValue.replace(/[^\d]/g, ''), 10);
  }
  const mileage = parseInt(mileageValue) || 0;

  let yearValue = item.firstRegistration || item.first_registration || item.erstzulassung || item.year;
  if (typeof yearValue === 'string') {
    const m = yearValue.match(/\b(19|20)\d{2}\b/);
    yearValue = m ? parseInt(m[0], 10) : parseInt(yearValue, 10);
  }
  let year = parseInt(yearValue) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;
  if (!year) year = currentYear;

  const location = item.location || item.standort || {};
  const locationCity = item.city || location.city || location.stadt || location.name || null;
  const locationRegion = item.region || location.region || location.bundesland || (locationCity ? 'Allemagne' : null);

  const fuelTypeMap = {
    diesel: 'diesel', benzin: 'petrol', petrol: 'petrol',
    elektro: 'electric', electric: 'electric', hybrid: 'hybrid'
  };
  const fuelTypeRaw = (item.fuelType || item.kraftstoff || '').toLowerCase();
  const fuelType = fuelTypeMap[fuelTypeRaw] || fuelTypeRaw || null;

  const transmissionMap = {
    automatik: 'automatic', automatic: 'automatic',
    schaltgetriebe: 'manual', manual: 'manual'
  };
  const transmissionRaw = (item.transmission || item.getriebe || '').toLowerCase();
  const transmission = transmissionMap[transmissionRaw] || transmissionRaw || null;

  const normalizedBrand = (item.brand || item.marke || item.make || null)?.toLowerCase() || null;
  const normalizedModel = (item.model || null)?.toLowerCase() || null;

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
    location_region: locationRegion,
    location_country: item.country ? String(item.country).toUpperCase().slice(0, 2) : 'DE',
    location_latitude: location.latitude || location.lat || null,
    location_longitude: location.longitude || location.lng || null,
    seller_type: item.seller_type
      ? (String(item.seller_type).toUpperCase() === 'DEALER' ? 'professional' : 'private')
      : (item.dealerName || item.haendler ? 'professional' : 'private'),
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : item.imageUrls ? [item.imageUrls].flat() : [],
    specifications: { ...(item.attributes || {}), ...(item.features || {}) },
    description: item.description || item.text || null,
    posted_date: item.postedDate || item.date ? new Date(item.postedDate || item.date) : new Date(),
    fuel_type: fuelType,
    transmission,
    color: item.color || item.farbe || null,
    doors: parseInt(item.doors || item.tueren, 10) || null,
    power_hp: parseInt(item.power || item.ps, 10) || null,
    displacement: (() => {
      const v = item.displacement ?? item.engine_size ?? item.hubraum;
      if (v == null) return null;
      const n = parseFloat(v);
      if (Number.isNaN(n)) return null;
      // Si > 100, c'est en ccm → convertir en litres
      return n > 100 ? n / 1000 : n;
    })(),
    category: item.category || item.fahrzeugtyp || null
  };
}
