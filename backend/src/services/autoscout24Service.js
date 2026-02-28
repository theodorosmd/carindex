import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo, isScrapeDoAvailable } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const SOURCE_PLATFORM = 'autoscout24';
const BASE_URL = 'https://www.autoscout24.com';

/**
 * Run AutoScout24 scraper.
 * Strategy: scrape.do primary (anti-bot bypass), Puppeteer fallback.
 * Flux: search pages → detail pages → raw_listings → processRawListings → listings
 */
export async function runAutoScout24Scraper(searchUrls, options = {}, progressCallback = null) {
  const results = { totalScraped: 0, saved: 0, errors: 0, processedUrls: [] };

  try {
    const maxPages = Math.min(options.maxPages || 20, 20); // AS24 limite à 20 pages
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting AutoScout24 scraper', { urls, options });

    for (const searchUrl of urls) {
      try {
        const pageListings = await scrapeAutoscout24Streaming(searchUrl, maxPages, async (batch, pageNum) => {
          if (batch.length === 0) return;

          await saveRawListings(batch, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: batch.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += batch.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('AutoScout24 batch saved', {
            page: pageNum,
            batchSize: batch.length,
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
        logger.error('Error scraping AutoScout24 URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('AutoScout24 scraper completed', results);
    return {
      runId: null,
      totalScraped: results.totalScraped,
      saved: results.saved,
      processedUrls: results.processedUrls
    };
  } catch (error) {
    logger.error('Error in AutoScout24 scraper', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Scrape AutoScout24 page-by-page, enrich with details, call onPageDone each batch
 */
async function scrapeAutoscout24Streaming(baseUrl, maxPages, onPageDone) {
  let usePuppeteer = !isScrapeDoAvailable();
  let browser = null;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const pageUrl = buildPageUrl(baseUrl, page);
      logger.info('AutoScout24 fetching search page', { page, url: pageUrl });

      let listings = [];

      if (!usePuppeteer) {
        try {
          const geoCode = (() => {
            if (baseUrl.includes('.be')) return 'be';
            if (baseUrl.includes('.de')) return 'de';
            if (baseUrl.includes('.it')) return 'it';
            if (baseUrl.includes('.at')) return 'at';
            if (baseUrl.includes('.nl')) return 'nl';
            if (baseUrl.includes('.es')) return 'es';
            if (baseUrl.includes('.fr')) return 'fr';
            if (baseUrl.includes('.lu')) return 'lu';
            return 'de';
          })();
          const html = await fetchViaScrapeDo(pageUrl, {
            render: true,
            customWait: 5000,
            geoCode
          });
          listings = parseSearchPage(html);
        } catch (err) {
          logger.warn('AutoScout24 scrape.do failed, switching to Puppeteer', { page, error: err.message });
          usePuppeteer = true;
        }
      }

      if (usePuppeteer && listings.length === 0) {
        if (!browser) {
          browser = await puppeteer.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--disable-blink-features=AutomationControlled'
            ]
          });
        }
        listings = await scrapeSearchPagePuppeteer(browser, pageUrl);
      }

      if (listings.length === 0) {
        logger.info('AutoScout24 no more listings found, stopping', { page });
        break;
      }

      logger.info('AutoScout24 search page parsed', { page, found: listings.length });

      // __NEXT_DATA__ already has full data (brand, model, price, mileage, fuel, etc.) - skip detail fetch for speed
      const enriched = listings;

      await onPageDone(enriched, page);
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
    }
  } finally {
    if (browser) await browser.close();
  }
}

function buildPageUrl(baseUrl, page) {
  if (page === 1) return baseUrl;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}page=${page}`;
}

/**
 * Extract listings from __NEXT_DATA__ (AutoScout24 uses Next.js)
 */
function parseEmbeddedListingData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return [];

  try {
    const json = JSON.parse(match[1]);
    const pageProps = json?.props?.pageProps || {};
    const list = pageProps?.listings || pageProps?.offers || pageProps?.items || [];
    if (!Array.isArray(list)) return [];

    const baseHost = (() => {
      const hosts = ['be', 'de', 'it', 'at', 'nl', 'es', 'fr', 'lu'];
      for (const tld of hosts) {
        if (html.includes(`autoscout24.${tld}`)) return `https://www.autoscout24.${tld}`;
      }
      return BASE_URL;
    })();

    const listings = [];
    for (const item of list) {
      let url = item?.url || item?.link || item?.detailUrl;
      if (!url) continue;

      url = url.startsWith('http') ? url : `${baseHost}${url.startsWith('/') ? '' : '/'}${url}`;
      const id = item?.id || item?.identifier?.crossReferenceId || item?.crossReferenceId || extractListingId(url);
      if (!id) continue;

      const v = item?.vehicle || {};
      const priceVal = item?.price?.amount ?? item?.price?.value ?? item?.price?.priceFormatted ?? item?.price;
      const mileageVal = item?.mileage ?? v?.mileage ?? v?.mileageInKm ?? item?.vehicleDetails?.mileage;

      listings.push({
        url,
        id: String(id),
        brand: v?.make || item?.make || null,
        model: v?.model || item?.model || null,
        price: typeof priceVal === 'number' ? priceVal : parseInt(String(priceVal || '').replace(/\D/g, ''), 10) || null,
        mileage: typeof mileageVal === 'number' ? mileageVal : parseInt(String(mileageVal || '').replace(/\D/g, ''), 10) || null,
        year: v?.year ?? item?.firstRegistration ?? item?.year ?? null,
        fuel_type: v?.fuel || v?.energy || null,
        transmission: v?.gearbox || v?.transmission || null,
        power_hp: v?.power ? parseInt(v.power, 10) : null,
        images: Array.isArray(item?.images) ? item.images : []
      });
    }
    return listings;
  } catch {
    return [];
  }
}

/**
 * Parse search results HTML.
 * 1. Try __NEXT_DATA__ / embedded JSON first (React/Next.js apps)
 * 2. Fallback to link extraction
 */
function parseSearchPage(html) {
  const fromJson = parseEmbeddedListingData(html);
  if (fromJson.length > 0) return fromJson;

  const $ = cheerio.load(html);
  const seen = new Set();
  const listings = [];

  const allLinks = $('a[href*="/offers/"], a[href*="/angebote/"], a[href*="/voiture/"], a[href*="/auto/"], a[href*="/listing/"], a[href*="/fahrzeuge/details/"], a[href*="/annonce/"]');

  allLinks.each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
    if (seen.has(fullUrl)) return;

    const id = extractListingId(fullUrl);
    if (!id) return;

    seen.add(fullUrl);

    const card = $(el).closest('article, [class*="card"], [class*="listing"], [class*="ListItem"], [class*="result"]').first() || $(el).parent();
    const text = card.text() || '';
    const priceM = text.match(/(\d[\d\s.]*)\s*€/);
    const kmM = text.match(/(\d[\d\s.]*)\s*km/i);
    const yearM = text.match(/\b(19|20)\d{2}\b/);
    const titleEl = card.find('h2, h3, [class*="title"], [class*="Title"]').first();
    const title = (titleEl.text() || $(el).text() || '').trim();
    const parts = title ? title.split(/\s+/).filter(Boolean) : [];

    listings.push({
      url: fullUrl,
      id,
      brand: parts[0] || null,
      model: parts.slice(1).join(' ') || null,
      price: priceM ? parseInt(priceM[1].replace(/\s/g, ''), 10) : null,
      mileage: kmM ? parseInt(kmM[1].replace(/\./g, ''), 10) : null,
      year: yearM ? parseInt(yearM[0], 10) : null,
      title
    });
  });

  return listings;
}

function extractListingId(url) {
  if (!url || typeof url !== 'string') return null;
  const uuidMatch = url.match(/[-]([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\?|$|\/)/i);
  if (uuidMatch) return uuidMatch[1];
  const numMatch = url.match(/\/details\/(\d+)/) || url.match(/\/(\d+)(?:\?|$)/);
  if (numMatch) return numMatch[1];
  const slugMatch = url.match(/\/offers\/[^/]+-([a-f0-9-]{36})$/i);
  if (slugMatch) return slugMatch[1];
  return null;
}

async function scrapeSearchPagePuppeteer(browser, pageUrl) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' });
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));
    const html = await page.content();
    return parseSearchPage(html);
  } finally {
    await page.close();
  }
}

async function enrichListingsWithDetails(listings, browser) {
  const enriched = [];
  for (let i = 0; i < listings.length; i++) {
    const item = listings[i];
    try {
      logger.info('AutoScout24 fetching detail', {
        listing: `${i + 1}/${listings.length}`,
        url: item.url
      });
      const details = await fetchListingDetails(item.url, browser);
      enriched.push(details ? { ...item, ...details } : item);
    } catch (err) {
      logger.warn('AutoScout24 detail fetch failed', { url: item.url, error: err.message });
      enriched.push(item);
    }
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));
  }
  return enriched;
}

async function fetchListingDetails(listingUrl, browser) {
  if (!listingUrl) return null;

  let html;
  if (isScrapeDoAvailable() && !browser) {
    html = await fetchViaScrapeDo(listingUrl, {
      render: true,
      customWait: 4000,
      geoCode: listingUrl.includes('.de') ? 'de' : listingUrl.includes('.fr') ? 'fr' : 'de'
    });
  } else if (browser) {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise((r) => setTimeout(r, 2000));
      html = await page.content();
    } finally {
      await page.close();
    }
  } else {
    html = await fetchViaScrapeDo(listingUrl, {
      render: true,
      customWait: 4000,
      geoCode: 'de'
    });
  }

  return parseDetailPage(html);
}

function parseDetailPage(html) {
  const $ = cheerio.load(html);
  const data = {};

  // 1. __NEXT_DATA__ (Next.js)
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1]);
      const pageProps = json?.props?.pageProps || {};
      const listing = pageProps?.listing || pageProps?.vehicle || pageProps?.offer || {};
      const vehicle = listing?.vehicle || listing;
      if (vehicle?.make) data.brand = vehicle.make;
      if (vehicle?.model) data.model = vehicle.model;
      if (vehicle?.power) data.power_hp = parseInt(vehicle.power, 10) || null;
      if (vehicle?.fuel) data.fuel_type = String(vehicle.fuel).toLowerCase();
      if (vehicle?.gearbox) data.transmission = String(vehicle.gearbox).toLowerCase();
      if (vehicle?.color) data.color = vehicle.color;
      if (vehicle?.doors) data.doors = parseInt(vehicle.doors, 10) || null;
      if (listing?.price?.amount) data.price = parseInt(listing.price.amount, 10) || null;
      if (listing?.mileage) data.mileage = parseInt(String(listing.mileage).replace(/\D/g, ''), 10) || null;
      if (vehicle?.year || listing?.firstRegistration) {
        data.year = parseInt(vehicle?.year || listing?.firstRegistration, 10) || null;
      }
      if (listing?.media?.images) {
        data.images = listing.media.images.map((img) => img.url || img.uri || img).filter(Boolean);
      }
    } catch {}
  }

  // 2. JSON-LD Vehicle
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const item = Array.isArray(json) ? json.find((x) => x['@type'] === 'Vehicle' || x['@type'] === 'Car') : json;
      if (!item || !['Vehicle', 'Car', 'Product'].includes(item['@type'])) return;
      if (item.name && !data.brand) {
        const parts = String(item.name).split(/\s+/);
        if (parts[0]) data.brand = parts[0];
        if (parts[1]) data.model = parts.slice(1).join(' ');
      }
      if (item.brand) data.brand = typeof item.brand === 'object' ? item.brand?.name : item.brand;
      if (item.model) data.model = item.model;
      if (item.offers?.price && !data.price) data.price = parseFloat(item.offers.price) || null;
      if (item.image) {
        data.images = (Array.isArray(item.image) ? item.image : [item.image])
          .map((img) => (typeof img === 'string' ? img : img.contentUrl || img.url || ''))
          .filter(Boolean);
      }
      if (item.description) data.description = item.description;
      if (item.mileageFromOdometer?.value) data.mileage = parseInt(item.mileageFromOdometer.value, 10) || null;
    } catch {}
  });

  // 3. Meta / HTML fallbacks
  const priceMeta = $('meta[property="product:price:amount"], [data-price], [itemprop="price"]').first().attr('content') ||
    $('[data-price]').first().attr('data-price');
  if (priceMeta && !data.price) data.price = parseInt(String(priceMeta).replace(/\D/g, ''), 10) || null;

  return data;
}

/**
 * Map AutoScout24 data to listing schema
 */
export function mapAutoscout24DataToListing(item, sourcePlatform = 'autoscout24') {
  const sourceListingId = item.id || extractListingId(item.url) || item.url;

  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price?.total?.amount ?? item.price?.amount ?? 0;
  } else {
    priceValue = item.price ?? item.priceValue ?? item.priceAmount ?? 0;
  }
  if (typeof priceValue === 'string') {
    priceValue = parseFloat(String(priceValue).replace(/[^\d.]/g, '')) || 0;
  }
  const price = parseFloat(priceValue) || 0;

  let mileage = parseInt(item.mileage || item.mileageValue || 0, 10) || 0;
  if (typeof item.mileage === 'string') {
    mileage = parseInt(String(item.mileage).replace(/\D/g, ''), 10) || 0;
  }

  let year = parseInt(item.firstRegistration || item.year || 0, 10) || null;
  const cy = new Date().getFullYear();
  if (year && (year < 1900 || year > cy + 1)) year = null;
  if (!year) year = cy;

  const loc = item.location || item.dealerLocation || {};
  let locationCountry = loc.country || 'DE';
  if (item.url) {
    if (item.url.includes('.be/')) locationCountry = 'BE';
    if (item.url.includes('.de/')) locationCountry = 'DE';
    if (item.url.includes('.it/')) locationCountry = 'IT';
    if (item.url.includes('.at/')) locationCountry = 'AT';
    if (item.url.includes('.nl/')) locationCountry = 'NL';
    if (item.url.includes('.es/')) locationCountry = 'ES';
    if (item.url.includes('.fr/')) locationCountry = 'FR';
    if (item.url.includes('.lu/')) locationCountry = 'LU';
    if (item.url.includes('.com/')) locationCountry = 'DE';
  }

  const fuelRaw = (item.fuelType || item.fuel_type || item.fuel || '').toLowerCase();
  const fuelType =
    fuelRaw.includes('diesel') ? 'diesel' :
    fuelRaw.includes('essence') || fuelRaw.includes('petrol') || fuelRaw.includes('gasoline') ? 'petrol' :
    fuelRaw || null;

  const transRaw = (item.transmission || '').toLowerCase();
  const transmission =
    transRaw.includes('auto') ? 'automatic' :
    transRaw.includes('manu') ? 'manual' :
    transRaw || null;

  const brand = (item.brand || item.make || null)?.toString().toLowerCase() || null;
  const model = (item.model || null)?.toString().toLowerCase() || null;

  return {
    source_platform: sourcePlatform,
    source_listing_id: String(sourceListingId),
    brand,
    model,
    year,
    mileage,
    price,
    currency: item.currency || 'EUR',
    location_city: loc.city || loc.name || null,
    location_region: loc.region || null,
    location_country: locationCountry,
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : item.mainImage ? [item.mainImage] : [],
    description: item.description || null,
    fuel_type: fuelType,
    transmission,
    color: item.color || null,
    doors: parseInt(item.doors, 10) || null,
    power_hp: parseInt(item.power || item.power_hp, 10) || null,
    displacement: parseFloat(item.displacement) || null,
    category: item.category || item.vehicleType || null
  };
}
