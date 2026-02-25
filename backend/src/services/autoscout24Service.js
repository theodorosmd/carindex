import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { upsertListingsBatch } from './ingestService.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const SOURCE_PLATFORM = 'autoscout24';

/**
 * Run AutoScout24 scraper (Puppeteer)
 */
export async function runAutoScout24Scraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = { totalScraped: 0, saved: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 20;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting AutoScout24 scraper (Puppeteer)', { urls, options });

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    for (const url of urls) {
      try {
        const listings = await scrapeAutoscout24Url(browser, url, maxPages);
        if (listings.length > 0) {
          await saveRawListings(listings, SOURCE_PLATFORM);
          const mapped = listings.map((i) => mapAutoscout24DataToListing(i));
          const valid = mapped.filter((l) => l.brand && l.model && l.price);
          if (valid.length > 0) {
            const r = await upsertListingsBatch(valid, { allowMissingRequired: true, useBulkUpsert: true });
            results.saved += (r.created || 0) + (r.updated || 0);
          }
          results.totalScraped += listings.length;
        }
        results.processedUrls.push(url);
        if (progressCallback) {
          await progressCallback({ totalScraped: results.totalScraped, totalSaved: results.saved, processedUrls: results.processedUrls });
        }
      } catch (err) {
        logger.error('Error scraping AutoScout24 URL', { url, error: err.message });
      }
    }

    return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeAutoscout24Url(browser, url, maxPages) {
  const page = await browser.newPage();
  const all = [];

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' });

    for (let p = 1; p <= maxPages; p++) {
      const pageUrl = p === 1 ? url : url.includes('?') ? `${url}&page=${p}` : `${url}?page=${p}`;
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);

      const items = await page.evaluate(() => {
        const out = [];
        const links = document.querySelectorAll('a[href*="/voiture/"], a[href*="/auto/"], a[href*="/listing/"]');
        const seen = new Set();
        links.forEach((a) => {
          const href = a.href || a.getAttribute('href');
          if (!href || seen.has(href)) return;
          const m = href.match(/\/(\d+)(?:\?|$)/);
          if (!m) return;
          seen.add(href);
          const card = a.closest('article, [class*="card"], [class*="listing"], [class*="result"]') || a;
          const text = card.textContent || '';
          const priceM = text.match(/(\d[\d\s.]*)\s*€/);
          const kmM = text.match(/(\d[\d\s.]*)\s*km/i);
          const yearM = text.match(/\b(19|20)\d{2}\b/);
          const title = card.querySelector('h2, h3, [class*="title"]')?.textContent?.trim() || a.textContent?.trim() || '';
          const parts = title.split(/\s+/);
          out.push({
            url: href.startsWith('http') ? href : `https://www.autoscout24.fr${href}`,
            id: m[1],
            brand: parts[0] || null,
            model: parts.slice(1).join(' ') || null,
            price: priceM ? parseInt(priceM[1].replace(/\s/g, ''), 10) : null,
            mileage: kmM ? parseInt(kmM[1].replace(/\s/g, ''), 10) : null,
            year: yearM ? parseInt(yearM[0], 10) : null,
            title
          });
        });
        return out;
      });

      const valid = items.filter((i) => i.url && i.id);
      all.push(...valid);
      if (valid.length === 0) break;
    }

    return all;
  } finally {
    await page.close();
  }
}

/**
 * Map AutoScout24 data to listing schema (Puppeteer scraped)
 */
export function mapAutoscout24DataToListing(item, sourcePlatform = 'autoscout24') {
  const urlMatch = item.url?.match(/\/(\d+)(?:\?|$)/);
  const sourceListingId = urlMatch ? urlMatch[1] : item.id || item.url;

  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price?.total?.amount ?? item.price?.amount ?? 0;
  } else {
    priceValue = item.price ?? item.priceValue ?? item.priceAmount ?? 0;
  }
  if (typeof priceValue === 'string') {
    priceValue = parseFloat(priceValue.replace(/[^\d.]/g, '')) || 0;
  }
  const price = parseFloat(priceValue) || 0;

  let mileage = parseInt(item.mileage || item.mileageValue || 0, 10) || 0;
  if (typeof item.mileage === 'string') {
    mileage = parseInt(item.mileage.replace(/\D/g, ''), 10) || 0;
  }

  let year = parseInt(item.firstRegistration || item.year || 0, 10) || null;
  const cy = new Date().getFullYear();
  if (year && (year < 1900 || year > cy + 1)) year = null;
  if (!year) year = cy;

  const loc = item.location || item.dealerLocation || {};
  const locationCity = loc.city || loc.name || null;
  let locationCountry = loc.country || 'FR';
  if (item.url) {
    if (item.url.includes('.de/')) locationCountry = 'DE';
    if (item.url.includes('.fr/')) locationCountry = 'FR';
    if (item.url.includes('.it/')) locationCountry = 'IT';
  }
  const regionMap = { FR: 'France', DE: 'Allemagne', IT: 'Italie' };
  const locationRegion = loc.region || regionMap[locationCountry] || null;

  const attrs = item.attributes || item.specifications || {};
  const fuelRaw = (item.fuelType || item.fuel || attrs.Fuel || attrs.fuel || '').toLowerCase();
  const fuelType = fuelRaw.includes('diesel') ? 'diesel' : fuelRaw.includes('essence') || fuelRaw.includes('petrol') ? 'petrol' : fuelRaw || null;

  const transRaw = (item.transmission || attrs.Transmission || attrs.transmission || '').toLowerCase();
  const transmission = transRaw.includes('auto') ? 'automatic' : transRaw.includes('manu') ? 'manual' : transRaw || null;

  const brand = (item.brand || item.make || null)?.toLowerCase() || null;
  const model = (item.model || null)?.toLowerCase() || null;

  return {
    source_platform: sourcePlatform,
    source_listing_id: String(sourceListingId),
    brand,
    model,
    year,
    mileage,
    price,
    currency: item.currency || 'EUR',
    location_city: locationCity,
    location_region: locationRegion,
    location_country: locationCountry,
    location_latitude: loc.latitude || loc.lat || null,
    location_longitude: loc.longitude || loc.lng || null,
    seller_type: item.dealerName || item.dealer ? 'professional' : 'private',
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : item.mainImage ? [item.mainImage] : [],
    specifications: { ...attrs },
    description: item.description || item.text || null,
    posted_date: item.postedDate || item.date ? new Date(item.postedDate || item.date) : new Date(),
    fuel_type: fuelType,
    transmission,
    color: item.color || attrs.color || null,
    doors: parseInt(item.doors || attrs['Door Count'], 10) || null,
    power_hp: parseInt(item.power || attrs.Power, 10) || null,
    displacement: parseFloat(item.displacement) || null,
    category: item.category || item.vehicleType || null
  };
}
