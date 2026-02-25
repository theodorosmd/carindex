import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { upsertListingsBatch } from './ingestService.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const SOURCE_PLATFORM = 'leboncoin';

/**
 * Run LeBonCoin scraper (Puppeteer)
 */
export async function runLeBonCoinScraper(searchUrls, options = {}, progressCallback = null) {
  let browser = null;
  const results = { totalScraped: 0, saved: 0, processedUrls: [] };

  try {
    const maxPages = options.maxPages || 15;
    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    logger.info('Starting LeBonCoin scraper (Puppeteer)', { urls, options });

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    for (const url of urls) {
      try {
        const listings = await scrapeLeBonCoinUrl(browser, url, maxPages);
        if (listings.length > 0) {
          await saveRawListings(listings, SOURCE_PLATFORM);
          const mapped = listings.map((i) => mapLeBonCoinDataToListing(i));
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
        logger.error('Error scraping LeBonCoin URL', { url, error: err.message });
      }
    }

    return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeLeBonCoinUrl(browser, url, maxPages) {
  const page = await browser.newPage();
  const all = [];

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9' });

    for (let p = 1; p <= maxPages; p++) {
      const pageUrl = p === 1 ? url : url.includes('?') ? `${url}&page=${p}` : `${url}?page=${p}`;
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000);

      const items = await page.evaluate(() => {
        const out = [];
        const links = document.querySelectorAll('a[href*="/ad/"], a[href*="/voitures/"], a[href*="/motos/"]');
        const seen = new Set();
        links.forEach((a) => {
          const href = a.href || a.getAttribute('href');
          if (!href || seen.has(href)) return;
          if (href.includes('/recherche') || href.includes('/c/')) return;
          const m = href.match(/\/(\d+)(?:\?|$)/) || href.match(/\/[a-z-]+\/([a-z0-9-]+)$/i);
          if (!m) return;
          const id = m[1].match(/\d+/) ? m[1] : m[1];
          if (!id) return;
          seen.add(href);
          const card = a.closest('article, [class*="card"], [class*="aditem"], [data-qa-id]') || a;
          const text = card.textContent || '';
          const priceM = text.match(/(\d[\d\s]*)\s*€/);
          const kmM = text.match(/(\d[\d\s]*)\s*km/i);
          const yearM = text.match(/\b(19|20)\d{2}\b/);
          const title = card.querySelector('h2, h3, [class*="title"], [data-qa-id*="title"]')?.textContent?.trim() || a.textContent?.trim() || '';
          const parts = title.split(/\s+/);
          out.push({
            url: href.startsWith('http') ? href : `https://www.leboncoin.fr${href}`,
            id: String(id).replace(/\D/g, '') || id,
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

      const valid = items.filter((i) => i.url && i.id && (i.price || i.title));
      all.push(...valid);
      if (valid.length === 0) break;
    }

    return all;
  } finally {
    await page.close();
  }
}

/**
 * Map LeBonCoin data to listing schema
 */
export function mapLeBonCoinDataToListing(item) {
  const urlMatch = item.url?.match(/\/(\d+)(?:\?|$)/);
  const sourceListingId = urlMatch ? urlMatch[1] : (item.id?.toString() || item.url);

  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price.amount || item.price.value || item.price.price || 0;
  } else if (typeof item.price === 'string') {
    priceValue = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
  } else {
    priceValue = item.price || 0;
  }
  const price = parseFloat(priceValue) || 0;

  const attrs = item.attributes || {};
  let mileage = parseInt(attrs['Mileage (km)'] || attrs.mileage || item.mileage || item.km || 0, 10) || 0;
  if (typeof mileage === 'string') mileage = parseInt(mileage.replace(/\D/g, ''), 10) || 0;

  let year = parseInt(item.firstRegistration || item.year || 0, 10) || null;
  const cy = new Date().getFullYear();
  if (year && (year < 1900 || year > cy + 1)) year = null;
  if (!year) year = cy;

  const loc = item.location || {};
  const addressStructured = loc.addressStructured || {};
  const locationCity = addressStructured.city || loc.city || null;
  const locationCountry = loc.country || 'FR';
  const locationRegion = addressStructured.region || loc.region || (locationCountry === 'FR' ? 'France' : null);

  const fuelTypeMap = { essence: 'petrol', diesel: 'diesel', électrique: 'electric', hybride: 'hybrid', gpl: 'gpl' };
  const fuelRaw = (attrs.Fuel || attrs.fuel || item.fuel || '').toLowerCase();
  const fuelType = fuelTypeMap[fuelRaw] || fuelRaw || null;

  const transRaw = (attrs.Transmission || attrs.transmission || item.transmission || '').toLowerCase();
  const transmission = transRaw.includes('auto') ? 'automatic' : transRaw.includes('manu') ? 'manual' : transRaw || null;

  const brand = (item.brand || item.make || null)?.toLowerCase() || null;
  const model = (item.model || null)?.toLowerCase() || null;

  return {
    source_platform: SOURCE_PLATFORM,
    source_listing_id: String(sourceListingId),
    brand,
    model,
    year,
    mileage,
    price,
    currency: item.price?.currency || 'EUR',
    location_city: locationCity,
    location_region: locationRegion,
    location_country: locationCountry,
    location_latitude: loc.coordinates?.latitude || loc.latitude || null,
    location_longitude: loc.coordinates?.longitude || loc.longitude || null,
    seller_type: item.dealerName || item.dealer ? 'professional' : 'private',
    url: item.url || null,
    images: Array.isArray(item.images) ? item.images : [],
    specifications: { ...attrs },
    description: item.description || item.text || null,
    posted_date: item.postedDate || item.date ? new Date(item.postedDate || item.date) : new Date(),
    fuel_type: fuelType,
    transmission,
    color: item.color || attrs.color || null,
    doors: parseInt(item.doors || attrs.doors, 10) || null,
    power_hp: parseInt(item.power || attrs.power, 10) || null,
    displacement: parseFloat(item.displacement) || null,
    category: item.category || item.vehicleType || null
  };
}
