import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { saveRawListings } from './rawIngestService.js';
import { processRawListings } from './rawListingsProcessorService.js';
import { fetchViaScrapeDo, isScrapeDoAvailable, isPageBlocked } from '../utils/scrapeDo.js';
import * as cheerio from 'cheerio';
import { launchBrowser } from '../utils/puppeteerLaunch.js';

const SOURCE_PLATFORM = 'blocket';

/**
 * Run Blocket.se scraper (Puppeteer) et envoie vers Ingest API
 * Flux : scrape → raw_listings → processRawListings → listings
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
    const maxPages = options.maxPages || 10;
    const useScrapeDoFirst = isScrapeDoAvailable();

    if (useScrapeDoFirst) {
      const pageConcurrency = parseInt(process.env.BLOCKET_CONCURRENT_PAGES || '5', 10) || 1;
      const detailConcurrency = parseInt(process.env.BLOCKET_CONCURRENT_DETAILS || '5', 10) || 1;
      logger.info('Starting Blocket.se scraper (scrape.do parallel)', { pageConcurrency, detailConcurrency });
      const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];
      for (const searchUrl of urls) {
        try {
          let shouldStop = false;
          for (let start = 1; start <= maxPages && !shouldStop; start += pageConcurrency) {
            const pageNums = [];
            for (let i = 0; i < pageConcurrency && start + i <= maxPages; i++) pageNums.push(start + i);
            const pageResults = await Promise.all(pageNums.map(async (pageNum) => {
              const pageUrl = pageNum === 1 ? searchUrl : (searchUrl.includes('?') ? `${searchUrl}&page=${pageNum}` : `${searchUrl}?page=${pageNum}`);
              const scraped = await scrapeBlocketSearchViaScraper(pageUrl);
              return { pageNum, scraped };
            }));
            for (const { pageNum, scraped } of pageResults) {
              if (scraped.length === 0 && pageNum === start) { shouldStop = true; break; }
              if (scraped.length === 0) continue;
              const enriched = [];
              for (let i = 0; i < scraped.length; i += detailConcurrency) {
                const chunk = scraped.slice(i, i + detailConcurrency);
                const chunkResults = await Promise.all(chunk.map(async (item) => {
                  try {
                    const details = await fetchBlocketDetailViaScraper(item.url);
                    return details ? { ...item, ...details } : item;
                  } catch { return item; }
                }));
                enriched.push(...chunkResults);
                await new Promise(r => setTimeout(r, 200));
              }
              await saveRawListings(enriched, SOURCE_PLATFORM);
              const processResult = await processRawListings({ limit: enriched.length + 100, sourcePlatform: SOURCE_PLATFORM });
              results.totalScraped += enriched.length;
              results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);
              if (progressCallback) await progressCallback({ totalScraped: results.totalScraped, totalSaved: results.saved, status: 'RUNNING', processedUrls: results.processedUrls });
            }
            if (pageResults[0]?.scraped?.length === 0) shouldStop = true;
            await new Promise(r => setTimeout(r, 1000));
          }
          results.processedUrls.push(searchUrl);
        } catch (err) {
          logger.error('Error scraping Blocket URL', { url: searchUrl, error: err.message });
          results.errors++;
        }
      }
      return { runId: null, totalScraped: results.totalScraped, saved: results.saved, processedUrls: results.processedUrls };
    }

    logger.info('Starting Blocket.se scraper (Puppeteer)', { searchUrls, options });

    browser = await launchBrowser();

    const urls = Array.isArray(searchUrls) ? searchUrls : [searchUrls];

    for (const searchUrl of urls) {
      try {
        logger.info('Scraping Blocket.se URL', { url: searchUrl });

        // Scrape page-by-page, saving each batch to DB immediately
        await scrapeBlocketUrlStreaming(browser, searchUrl, maxPages, async (pageListings, pageNum) => {
          if (pageListings.length === 0) return;

          const { saved } = await saveRawListings(pageListings, SOURCE_PLATFORM);
          const processResult = await processRawListings({
            limit: pageListings.length + 100,
            sourcePlatform: SOURCE_PLATFORM
          });

          results.totalScraped += pageListings.length;
          results.saved += (processResult.created || 0) + (processResult.updated || 0) + (processResult.sourceAdded || 0);

          logger.info('Blocket.se batch saved', {
            page: pageNum,
            batchSize: pageListings.length,
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
        logger.error('Error scraping Blocket.se URL', { url: searchUrl, error: error.message });
        results.errors++;
      }
    }

    logger.info('Blocket.se scraper completed', results);
    return {
      runId: null,
      totalScraped: results.totalScraped,
      saved: results.saved,
      processedUrls: results.processedUrls
    };
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
 * Scrape Blocket.se page-by-page, calling onPageDone(listings, pageNum) after each page
 * so data is saved to DB incrementally instead of waiting for all pages.
 */
async function scrapeBlocketUrlStreaming(browser, url, maxPages, onPageDone) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.blocket.se/'
    });

    let currentPage = 1;

    while (currentPage <= maxPages) {
      const pageUrl = currentPage === 1
        ? url
        : url.includes('?') ? `${url}&page=${currentPage}` : `${url}?page=${currentPage}`;

      let gotoOk = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
          gotoOk = true;
          break;
        } catch (e) {
          logger.warn('Blocket page.goto retry', { page: currentPage, attempt, error: e.message });
          if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
          else { logger.warn('Blocket page.goto failed after 3 attempts, skipping page', { page: currentPage }); }
        }
      }
      if (!gotoOk) { currentPage++; continue; }
      await new Promise(r => setTimeout(r, 3000));

      if (await isPageBlocked(page)) {
        logger.warn('Blocket search page blocked, falling back to scrape.do', { page: currentPage });
        const scrapedListings = await scrapeBlocketSearchViaScraper(pageUrl);
        if (scrapedListings.length === 0) break;
        const enriched = [];
        for (const item of scrapedListings) {
          try {
            const details = await fetchBlocketDetailViaScraper(item.url);
            enriched.push(details ? { ...item, ...details } : item);
          } catch { enriched.push(item); }
        }
        await onPageDone(enriched, currentPage);
        currentPage++;
        continue;
      }

      if (currentPage === 1) {
        try {
          const cookieBtn = await page.$('button[data-testid="accept-cookies"], button[id*="accept"], button[class*="consent"]');
          if (cookieBtn) {
            await cookieBtn.click();
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch { /* cookie dialog may not appear */ }
      }

      const pageListings = await page.evaluate(() => {
        const items = [];
        const links = document.querySelectorAll('a.sf-search-ad-link[href*="/mobility/item/"]');
        const seen = new Set();

        links.forEach((a) => {
          const href = a.href || a.getAttribute('href');
          if (!href || seen.has(href)) return;

          const idMatch = href.match(/\/item\/(\d+)/);
          const sourceListingId = idMatch ? idMatch[1] : null;
          if (!sourceListingId) return;
          seen.add(href);

          const card = a.closest('.mobility-search-ad-card-content') || a.closest('div') || a;
          const text = card.textContent || '';
          const title = card.querySelector('h2')?.textContent?.trim() || a.textContent?.trim() || '';
          const priceMatch = text.match(/([\d\s]+)\s*kr/);
          const yearMatch = text.match(/\b(19|20)\d{2}\b/);
          const milMatch = text.match(/([\d\s\u00a0]+)\s*mil\b/);
          const makeModel = title.split(/\s+/);

          items.push({
            url: href.startsWith('http') ? href : `https://www.blocket.se${href}`,
            id: sourceListingId,
            brand: makeModel[0] || null,
            model: makeModel.slice(1).join(' ') || null,
            title,
            price: priceMatch ? parseInt(priceMatch[1].replace(/[\s\u00a0]/g, ''), 10) : null,
            mileageMil: milMatch ? parseInt(milMatch[1].replace(/[\s\u00a0]/g, ''), 10) : null,
            year: yearMatch ? parseInt(yearMatch[0], 10) : null
          });
        });

        return items;
      });

      const valid = pageListings.filter((i) => i.url && i.id);

      // Fetch detail page for each listing
      const enriched = [];
      for (const item of valid) {
        try {
          const details = await fetchBlocketListingDetails(browser, item.url);
          enriched.push(details ? { ...item, ...details } : item);
        } catch (error) {
          logger.warn('Error fetching Blocket listing details', { url: item.url, error: error.message });
          enriched.push(item);
        }
      }

      logger.info('Blocket.se page scraped', { page: currentPage, found: valid.length });

      // Save this page's listings to DB immediately
      await onPageDone(enriched, currentPage);

      if (valid.length === 0) break;
      currentPage++;
    }
  } finally {
    await page.close();
  }
}

/**
 * Fetch detailed information from a Blocket listing page.
 * Tries Puppeteer first, falls back to scrape.do if blocked.
 */
async function fetchBlocketListingDetails(browser, listingUrl) {
  // Try Puppeteer first
  const page = await browser.newPage();

  try {
    await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    if (await isPageBlocked(page)) {
      await page.close();
      return fetchBlocketDetailViaScraper(listingUrl);
    }

    const details = await page.evaluate(() => {
      const data = {};

      // 1. JSON-LD: images, seller type, price (as backup)
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of jsonLdScripts) {
        try {
          const json = JSON.parse(s.textContent);
          if (json['@type'] === 'Product') {
            if (Array.isArray(json.image)) {
              data.images = json.image.map(img =>
                typeof img === 'string' ? img : img.contentUrl || img.url || ''
              ).filter(Boolean);
            }
            const sellerType = json.offers?.seller?.['@type'];
            data.sellerType = sellerType === 'Organization' ? 'professional' : 'private';
            break;
          }
        } catch { /* ignore parse errors */ }
      }

      // Fallback: og:image if JSON-LD had no images
      if (!data.images || data.images.length === 0) {
        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg?.content) data.images = [ogImg.content];
      }

      // 2. Specifications from <dl> inside section.key-info-section
      const specs = {};
      const dl = document.querySelector('section.key-info-section dl, dl.emptycheck');
      if (dl) {
        const dts = dl.querySelectorAll('dt');
        dts.forEach(dt => {
          const dd = dt.nextElementSibling;
          if (dd && dd.tagName === 'DD') {
            const label = dt.textContent.replace(/[^\w\sÅÄÖåäö()-]/g, '').trim();
            const value = dd.textContent.trim();
            if (label && value) {
              specs[label.toLowerCase()] = value;
            }
          }
        });
      }

      // 3. Description: text after <h2>Beskrivning</h2>
      const headings = document.querySelectorAll('h2');
      for (const h of headings) {
        if (h.textContent.trim() === 'Beskrivning') {
          let sibling = h.nextElementSibling;
          while (sibling) {
            if (sibling.tagName === 'H2' || sibling.tagName === 'SECTION') break;
            const text = sibling.textContent?.trim();
            if (text && text.length > 10) {
              data.description = text;
              break;
            }
            sibling = sibling.nextElementSibling;
          }
          break;
        }
      }

      // 4. Location: text after <h2>Plats</h2>
      for (const h of headings) {
        if (h.textContent.trim() === 'Plats') {
          let sibling = h.nextElementSibling;
          while (sibling) {
            if (sibling.tagName === 'H2' || sibling.tagName === 'SECTION') break;
            const text = sibling.textContent?.trim();
            if (text && text.length > 2 && !text.includes('cookie')) {
              data.location = text;
              break;
            }
            sibling = sibling.nextElementSibling;
          }
          break;
        }
      }

      // 5. Equipment: list after <h2>Utrustning</h2>
      for (const h of headings) {
        if (h.textContent.trim() === 'Utrustning') {
          let sibling = h.nextElementSibling;
          const equipment = [];
          while (sibling) {
            if (sibling.tagName === 'H2' || sibling.tagName === 'SECTION') break;
            const items = sibling.querySelectorAll('li, span, div');
            items.forEach(el => {
              const t = el.textContent?.trim();
              if (t && t.length > 1 && t.length < 100) equipment.push(t);
            });
            if (equipment.length > 0) break;
            sibling = sibling.nextElementSibling;
          }
          if (equipment.length > 0) specs['utrustning'] = equipment.join(', ');
          break;
        }
      }

      return { ...data, specifications: specs };
    });

    return details;

  } catch (error) {
    logger.warn('Puppeteer failed for Blocket detail, trying scrape.do', { url: listingUrl, error: error.message });
    await page.close();
    return fetchBlocketDetailViaScraper(listingUrl);
  }
}

async function scrapeBlocketSearchViaScraper(pageUrl) {
  if (!isScrapeDoAvailable()) return [];
  try {
    let html = await fetchViaScrapeDo(pageUrl, { render: false, geoCode: 'se' });
    const $ = cheerio.load(html);
    let listings = [];
    const seen = new Set();

    $('a.sf-search-ad-link[href*="/mobility/item/"]').each((_, a) => {
      const href = $(a).attr('href');
      const idMatch = href?.match(/\/item\/(\d+)/);
      if (!idMatch || seen.has(idMatch[1])) return;
      seen.add(idMatch[1]);

      const card = $(a).closest('.mobility-search-ad-card-content') || $(a).closest('div');
      const text = card.text() || $(a).text();
      const title = card.find('h2').first().text().trim() || $(a).text().trim();
      const priceMatch = text.match(/([\d\s]+)\s*kr/);
      const yearMatch = text.match(/\b(19|20)\d{2}\b/);
      const milMatch = text.match(/([\d\s\u00a0]+)\s*mil\b/);
      const parts = title.split(/\s+/);

      listings.push({
        url: href.startsWith('http') ? href : `https://www.blocket.se${href}`,
        id: idMatch[1],
        brand: parts[0] || null,
        model: parts.slice(1).join(' ') || null,
        title,
        price: priceMatch ? parseInt(priceMatch[1].replace(/[\s\u00a0]/g, ''), 10) : null,
        mileageMil: milMatch ? parseInt(milMatch[1].replace(/[\s\u00a0]/g, ''), 10) : null,
        year: yearMatch ? parseInt(yearMatch[0], 10) : null,
      });
    });
    if (listings.length === 0 && html?.length > 500) {
      html = await fetchViaScrapeDo(pageUrl, { render: true, customWait: 4000, geoCode: 'se' });
      const $2 = cheerio.load(html);
      listings = [];
      $2('a.sf-search-ad-link[href*="/mobility/item/"]').each((_, a) => {
        const href = $2(a).attr('href');
        const idMatch = href?.match(/\/item\/(\d+)/);
        if (!idMatch || listings.some((l) => l.id === idMatch[1])) return;
        const card = $2(a).closest('.mobility-search-ad-card-content') || $2(a).closest('div');
        const text = card.text() || $2(a).text();
        const title = card.find('h2').first().text().trim() || $2(a).text().trim();
        const priceMatch = text.match(/([\d\s]+)\s*kr/);
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        const milMatch = text.match(/([\d\s\u00a0]+)\s*mil\b/);
        const parts = title.split(/\s+/);
        listings.push({
          url: href.startsWith('http') ? href : `https://www.blocket.se${href}`,
          id: idMatch[1],
          brand: parts[0] || null,
          model: parts.slice(1).join(' ') || null,
          title,
          price: priceMatch ? parseInt(priceMatch[1].replace(/[\s\u00a0]/g, ''), 10) : null,
          mileageMil: milMatch ? parseInt(milMatch[1].replace(/[\s\u00a0]/g, ''), 10) : null,
          year: yearMatch ? parseInt(yearMatch[0], 10) : null,
        });
      });
    }
    return listings;
  } catch (err) {
    logger.warn('scrape.do search fallback failed for Blocket', { error: err.message });
    return [];
  }
}

async function fetchBlocketDetailViaScraper(listingUrl) {
  if (!isScrapeDoAvailable()) return null;

  try {
    const html = await fetchViaScrapeDo(listingUrl, { geoCode: 'se' });
    const $ = cheerio.load(html);
    const data = {};

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json['@type'] === 'Product') {
          if (Array.isArray(json.image)) {
            data.images = json.image.map(img => typeof img === 'string' ? img : img.contentUrl || img.url || '').filter(Boolean);
          }
          data.sellerType = json.offers?.seller?.['@type'] === 'Organization' ? 'professional' : 'private';
        }
      } catch { /* ignore */ }
    });

    if (!data.images?.length) {
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (ogImg) data.images = [ogImg];
    }

    const specs = {};
    const dl = $('section.key-info-section dl, dl.emptycheck');
    if (dl.length) {
      dl.find('dt').each((_, dt) => {
        const dd = $(dt).next('dd');
        const label = $(dt).text().replace(/[^\w\sÅÄÖåäö()-]/g, '').trim().toLowerCase();
        const value = dd.text().trim();
        if (label && value) specs[label] = value;
      });
    }

    const headings = $('h2');
    headings.each((_, h) => {
      const text = $(h).text().trim();
      if (text === 'Beskrivning') {
        const next = $(h).next();
        const t = next?.text()?.trim();
        if (t && t.length > 10) data.description = t;
      }
      if (text === 'Plats') {
        const next = $(h).next();
        const t = next?.text()?.trim();
        if (t && t.length > 2) data.location = t;
      }
      if (text === 'Utrustning') {
        const equipment = [];
        $(h).next().find('li, span, div').each((_, el) => {
          const t = $(el).text().trim();
          if (t.length > 1 && t.length < 100) equipment.push(t);
        });
        if (equipment.length) specs['utrustning'] = equipment.join(', ');
      }
    });

    return { ...data, specifications: specs };
  } catch (err) {
    logger.warn('scrape.do fallback also failed for Blocket detail', { url: listingUrl, error: err.message });
    return null;
  }
}

/**
 * Map Blocket scraper data to our database schema
 * (Utilisé par rawListingsProcessorService et pour l'ingest)
 */
export function mapBlocketDataToListing(item) {
  const urlMatch =
    item.url?.match(/\/item\/(\d+)/) ||
    item.url?.match(/\/ad\/([a-z0-9-]+)/i) ||
    item.url?.match(/\/annonser\/[^/]+\/(\d+)/) ||
    item.url?.match(/\/(\d+)(?:\?|$)/);
  const sourceListingId = urlMatch
    ? urlMatch[1]
    : item.id
      ? String(item.id)
      : item.url;

  const specs = item.specifications || {};

  // Price
  let priceValue = 0;
  if (item.price && typeof item.price === 'object') {
    priceValue = item.price.value || item.price.amount || item.price.price || 0;
  } else if (typeof item.price === 'string') {
    priceValue = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
  } else {
    priceValue = item.price || 0;
  }
  const price = parseFloat(priceValue) || 0;

  // Mileage: detail page "miltal" is "26 600 mil" — extract number, convert mil→km (*10)
  let mileageRaw = item.mileageMil || specs['miltal'] || 0;
  if (typeof mileageRaw === 'string') {
    mileageRaw = parseInt(mileageRaw.replace(/[^\d]/g, ''), 10);
  }
  const mileage = (parseInt(mileageRaw) || 0) * 10;

  // Year: detail page key is "modellår"
  let yearValue = item.year || specs['modellår'] || specs['år'];
  if (typeof yearValue === 'string') {
    const m = yearValue.match(/\b(19|20)\d{2}\b/);
    yearValue = m ? parseInt(m[0], 10) : parseInt(yearValue, 10);
  }
  let year = parseInt(yearValue) || null;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear + 1)) year = null;

  // Brand & model: prefer detail page specs, fallback to title
  const specBrand = specs['märke'] || null;
  const specModel = specs['modell'] || null;
  const titleParts = (item.title || '').split(' ');
  const brand = specBrand || item.brand || titleParts[0] || null;
  const model = specModel || item.model || titleParts.slice(1, 3).join(' ') || null;

  // Fuel type: detail page key is "drivmedel"
  const fuelTypeRaw = (specs['drivmedel'] || specs['bränsle'] || '').toLowerCase();
  const fuelType = normalizeFuelType(fuelTypeRaw);

  // Transmission: detail page key is "växellåda"
  const transmissionRaw = (specs['växellåda'] || '').toLowerCase();
  const transmission = normalizeTransmission(transmissionRaw);

  // Power: detail page key is "effekt" — value like "265 Hk"
  const powerRaw = specs['effekt'] || null;
  const powerHp = powerRaw ? parseInt(String(powerRaw).replace(/[^\d]/g, ''), 10) || null : null;

  // Location: detail page "Plats" gives "Mejerigatan 2, 41276 Göteborg"
  // Also available in specs as "bilens plats"
  const locationStr = item.location || specs['bilens plats'] || '';
  const { city: locationCity, region: locationRegion } = parseSwedishAddress(locationStr);

  // Seller type
  const sellerType = item.sellerType === 'professional' || item.sellerType === 'dealer'
    ? 'professional'
    : 'private';

  // Drivetrain: detail page key is "drivhjul"
  const drivetrainRaw = specs['drivhjul'] || null;

  // Category & doors: "biltyp" can be "Halvkombi 5-dörrar" — split body type from door count
  const rawCategory = specs['biltyp'] || '';
  const doorMatch = rawCategory.match(/(\d+)-?dörr/i);
  const doorsFromCategory = doorMatch ? parseInt(doorMatch[1], 10) : null;
  const doorsFromSpecs = parseInt(specs['antal dörrar'] || specs['dörrar'], 10) || null;
  const categoryClean = rawCategory.replace(/\s*\d+-?dörr\w*/i, '').trim() || null;
  const normalizedCat = normalizeCategory(categoryClean);
  const doors = doorsFromSpecs || doorsFromCategory || inferDoorsFromCategory(normalizedCat);

  // Version/trim: extract from utrustning first item or known patterns
  const { version, trim } = extractVersionTrim(specs, model);

  return {
    source_platform: SOURCE_PLATFORM,
    source_listing_id: String(sourceListingId),
    brand: normalizeBrand(brand),
    model: normalizeModel(model),
    year,
    mileage,
    price,
    currency: 'SEK',
    location_city: locationCity,
    location_region: locationRegion,
    location_country: 'SE',
    seller_type: sellerType,
    url: item.url || null,
    images: (item.images && item.images.length > 0) ? item.images : (item.image ? [item.image] : []),
    specifications: specs,
    description: item.description || null,
    posted_date: new Date(),
    fuel_type: fuelType,
    transmission,
    steering: 'LHD',
    color: specs['färg'] || null,
    doors,
    power_hp: powerHp,
    displacement: (() => {
      const v = specs['motorvolym'] || specs['cylindervolym'];
      if (v == null) return null;
      const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.]/g, ''));
      if (Number.isNaN(n)) return null;
      return n > 100 ? n / 1000 : n;
    })(),
    version,
    trim,
    category: normalizedCat,
    drivetrain: normalizeDrivetrain(drivetrainRaw)
  };
}

// Helper functions (same pattern as Bytbil)

const SWEDISH_CITY_TO_REGION = {
  'stockholm': 'Stockholms län', 'solna': 'Stockholms län', 'sundbyberg': 'Stockholms län',
  'sollentuna': 'Stockholms län', 'järfälla': 'Stockholms län', 'täby': 'Stockholms län',
  'danderyd': 'Stockholms län', 'nacka': 'Stockholms län', 'lidingö': 'Stockholms län',
  'huddinge': 'Stockholms län', 'botkyrka': 'Stockholms län', 'haninge': 'Stockholms län',
  'tyresö': 'Stockholms län', 'värmdö': 'Stockholms län', 'gustavsberg': 'Stockholms län',
  'vällingby': 'Stockholms län', 'bandhagen': 'Stockholms län', 'kista': 'Stockholms län',
  'saltsjö-boo': 'Stockholms län', 'segeltorp': 'Stockholms län', 'kungens kurva': 'Stockholms län',
  'bromma': 'Stockholms län', 'hägersten': 'Stockholms län', 'enskede': 'Stockholms län',
  'farsta': 'Stockholms län', 'skärholmen': 'Stockholms län', 'älvsjö': 'Stockholms län',
  'spånga': 'Stockholms län', 'hässelby': 'Stockholms län', 'åkersberga': 'Stockholms län',
  'märsta': 'Stockholms län', 'sigtuna': 'Stockholms län', 'upplands väsby': 'Stockholms län',
  'norrtälje': 'Stockholms län', 'södertälje': 'Stockholms län', 'nynäshamn': 'Stockholms län',
  'vallentuna': 'Stockholms län', 'arlandastad': 'Stockholms län', 'rosersberg': 'Stockholms län',
  'kungsängen': 'Stockholms län', 'brandbergen': 'Stockholms län', 'handen': 'Stockholms län',
  'norsborg': 'Stockholms län', 'tullinge': 'Stockholms län', 'tumba': 'Stockholms län',
  'skogås': 'Stockholms län', 'rydboholm': 'Stockholms län', 'österhaninge': 'Stockholms län',
  'österskär': 'Stockholms län', 'angered': 'Västra Götalands län',

  'göteborg': 'Västra Götalands län', 'mölndal': 'Västra Götalands län',
  'borås': 'Västra Götalands län', 'trollhättan': 'Västra Götalands län',
  'uddevalla': 'Västra Götalands län', 'skövde': 'Västra Götalands län',
  'lidköping': 'Västra Götalands län', 'alingsås': 'Västra Götalands län',
  'kungsbacka': 'Hallands län', 'kungälv': 'Västra Götalands län',
  'lerum': 'Västra Götalands län', 'partille': 'Västra Götalands län',
  'kinna': 'Västra Götalands län', 'svenljunga': 'Västra Götalands län',
  'askim': 'Västra Götalands län', 'hisings backa': 'Västra Götalands län',
  'stora höga': 'Västra Götalands län', 'vänersborg': 'Västra Götalands län',
  'mariestad': 'Västra Götalands län', 'falköping': 'Västra Götalands län',
  'stenungsund': 'Västra Götalands län', 'strömstad': 'Västra Götalands län',
  'hisings kärra': 'Västra Götalands län', 'herrljunga': 'Västra Götalands län',
  'mölnlycke': 'Västra Götalands län', 'sävedalen': 'Västra Götalands län',
  'västra frölunda': 'Västra Götalands län', 'ytterby': 'Västra Götalands län',
  'öckerö': 'Västra Götalands län', 'skene': 'Västra Götalands län',
  'rångedala': 'Västra Götalands län', 'ulricehamn': 'Västra Götalands län',
  'tranemo': 'Västra Götalands län', 'tidaholm': 'Västra Götalands län',
  'stenstorp': 'Västra Götalands län', 'vara': 'Västra Götalands län',
  'vargön': 'Västra Götalands län', 'kungshamn': 'Västra Götalands län',
  'skee': 'Västra Götalands län', 'karlsborg': 'Västra Götalands län',
  'målsryd': 'Västra Götalands län', 'torup': 'Västra Götalands län',
  'åmål': 'Västra Götalands län',

  'malmö': 'Skåne län', 'helsingborg': 'Skåne län', 'lund': 'Skåne län',
  'kristianstad': 'Skåne län', 'landskrona': 'Skåne län', 'trelleborg': 'Skåne län',
  'ängelholm': 'Skåne län', 'eslöv': 'Skåne län', 'hässleholm': 'Skåne län',
  'ystad': 'Skåne län', 'tomelilla': 'Skåne län', 'simrishamn': 'Skåne län',
  'gärsnäs': 'Skåne län', 'viken': 'Skåne län', 'ödåkra': 'Skåne län',
  'staffanstorp': 'Skåne län', 'lomma': 'Skåne län', 'höganäs': 'Skåne län',
  'klippan': 'Skåne län', 'svalöv': 'Skåne län', 'sjöbo': 'Skåne län',
  'arlöv': 'Skåne län', 'bromölla': 'Skåne län', 'genarp': 'Skåne län',
  'hasslarp': 'Skåne län', 'hörby': 'Skåne län', 'mörarp': 'Skåne län',
  'nävlinge': 'Skåne län', 'osby': 'Skåne län', 'svedala': 'Skåne län',
  'vellinge': 'Skåne län',

  'uppsala': 'Uppsala län', 'bålsta': 'Uppsala län', 'knivsta': 'Uppsala län',
  'enköping': 'Uppsala län', 'tierp': 'Uppsala län',
  'alunda': 'Uppsala län', 'järlåsa': 'Uppsala län', 'östhammar': 'Uppsala län',

  'västerås': 'Västmanlands län', 'sala': 'Västmanlands län', 'köping': 'Västmanlands län',
  'arboga': 'Västmanlands län', 'hallstahammar': 'Västmanlands län',
  'surahammar': 'Västmanlands län', 'kungsör': 'Västmanlands län',

  'örebro': 'Örebro län', 'hallsberg': 'Örebro län', 'kumla': 'Örebro län',
  'lindesberg': 'Örebro län', 'karlskoga': 'Örebro län',

  'linköping': 'Östergötlands län', 'norrköping': 'Östergötlands län',
  'motala': 'Östergötlands län', 'mjölby': 'Östergötlands län',
  'mantorp': 'Östergötlands län', 'skänninge': 'Östergötlands län',
  'åtvidaberg': 'Östergötlands län',

  'jönköping': 'Jönköpings län', 'huskvarna': 'Jönköpings län',
  'nässjö': 'Jönköpings län', 'vetlanda': 'Jönköpings län',
  'skillingaryd': 'Jönköpings län', 'tranås': 'Jönköpings län',
  'gislaved': 'Jönköpings län', 'värnamo': 'Jönköpings län',
  'eksjö': 'Jönköpings län', 'hillerstorp': 'Jönköpings län',
  'sävsjö': 'Jönköpings län', 'taberg': 'Jönköpings län',

  'växjö': 'Kronobergs län', 'ljungby': 'Kronobergs län', 'alvesta': 'Kronobergs län',
  'älmhult': 'Kronobergs län',

  'kalmar': 'Kalmar län', 'nybro': 'Kalmar län', 'oskarshamn': 'Kalmar län',
  'västervik': 'Kalmar län', 'vimmerby': 'Kalmar län',
  'borgholm': 'Kalmar län',

  'karlskrona': 'Blekinge län', 'karlshamn': 'Blekinge län',
  'ronneby': 'Blekinge län', 'olofström': 'Blekinge län', 'sölvesborg': 'Blekinge län',
  'mörrum': 'Blekinge län',

  'halmstad': 'Hallands län', 'varberg': 'Hallands län',
  'falkenberg': 'Hallands län', 'laholm': 'Hallands län',

  'karlstad': 'Värmlands län', 'kristinehamn': 'Värmlands län',
  'arvika': 'Värmlands län', 'hagfors': 'Värmlands län', 'sunne': 'Värmlands län',
  'edsvalla': 'Värmlands län', 'skattkärr': 'Värmlands län',

  'falun': 'Dalarnas län', 'borlänge': 'Dalarnas län', 'mora': 'Dalarnas län',
  'ludvika': 'Dalarnas län', 'avesta': 'Dalarnas län', 'leksand': 'Dalarnas län',
  'rättvik': 'Dalarnas län', 'smedjebacken': 'Dalarnas län', 'säter': 'Dalarnas län',
  'vansbro': 'Dalarnas län', 'krylbo': 'Dalarnas län',

  'gävle': 'Gävleborgs län', 'sandviken': 'Gävleborgs län',
  'hudiksvall': 'Gävleborgs län', 'bollnäs': 'Gävleborgs län', 'söderhamn': 'Gävleborgs län',
  'hofors': 'Gävleborgs län', 'valbo': 'Gävleborgs län',

  'sundsvall': 'Västernorrlands län', 'härnösand': 'Västernorrlands län',
  'timrå': 'Västernorrlands län', 'örnsköldsvik': 'Västernorrlands län',
  'kramfors': 'Västernorrlands län', 'sollefteå': 'Västernorrlands län',
  'ånge': 'Västernorrlands län', 'sundsbruk': 'Västernorrlands län',

  'östersund': 'Jämtlands län', 'sveg': 'Jämtlands län',
  'bräcke': 'Jämtlands län', 'frösön': 'Jämtlands län',

  'umeå': 'Västerbottens län', 'skellefteå': 'Västerbottens län',
  'lycksele': 'Västerbottens län', 'dorotea': 'Västerbottens län',
  'fredrika': 'Västerbottens län', 'moliden': 'Västerbottens län',
  'vindeln': 'Västerbottens län', 'vännäs': 'Västerbottens län',

  'luleå': 'Norrbottens län', 'piteå': 'Norrbottens län', 'boden': 'Norrbottens län',
  'kiruna': 'Norrbottens län', 'gällivare': 'Norrbottens län', 'kalix': 'Norrbottens län',

  'nyköping': 'Södermanlands län', 'eskilstuna': 'Södermanlands län',
  'katrineholm': 'Södermanlands län', 'strängnäs': 'Södermanlands län',
  'flen': 'Södermanlands län', 'oxelösund': 'Södermanlands län',
  'björkvik': 'Södermanlands län',

  'visby': 'Gotlands län'
};

function resolveSwedishRegion(city) {
  if (!city) return null;
  return SWEDISH_CITY_TO_REGION[city.toLowerCase()] || null;
}

function parseSwedishAddress(location) {
  if (!location) return { city: null, region: null };

  const parts = location.split(',').map(s => s.trim());
  let cityName = null;

  if (parts.length >= 2) {
    const afterComma = parts[parts.length - 1];
    const cityMatch = afterComma.match(/\d{3}\s*\d{2}\s+(.+)/);
    cityName = cityMatch ? cityMatch[1].trim() : afterComma;
  } else {
    const zipCity = location.match(/\d{3}\s*\d{2}\s+(.+)/);
    cityName = zipCity ? zipCity[1].trim() : location.trim();
  }

  if (!cityName) return { city: null, region: null };
  return { city: cityName, region: resolveSwedishRegion(cityName) };
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
    'saab': 'Saab',
    'aston': 'Aston Martin',
    'land': 'Land Rover',
    'alfa': 'Alfa Romeo'
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
    'hybrid bensin': 'hybrid',
    'hybrid diesel': 'hybrid',
    'plug-in bensin': 'plug-in hybrid',
    'plug-in diesel': 'plug-in hybrid',
    'plug-in hybrid': 'plug-in hybrid',
    'etanol': 'ethanol',
    'etanol (ffv, e85)': 'ethanol',
    'fordonsgas': 'cng',
    'fordonsgas (cng)': 'cng'
  };
  return fuelMap[fuelType] || fuelType || null;
}

function normalizeTransmission(transmission) {
  if (!transmission) return null;
  const transMap = {
    'manuell': 'manual',
    'automatisk': 'automatic',
    'automat': 'automatic',
    'sekventiell': 'sequential',
    'cvt': 'cvt'
  };
  return transMap[transmission] || transmission || null;
}

function normalizeDrivetrain(drivetrain) {
  if (!drivetrain) return null;
  const driveMap = {
    'framhjulsdrift': 'fwd',
    'bakhjulsdrift': 'rwd',
    'fyrhjulsdrift': 'awd',
    'tvåhjulsdriven': 'fwd',
    '4x4': 'awd'
  };
  return driveMap[drivetrain.toLowerCase()] || drivetrain.toLowerCase() || null;
}

function normalizeCategory(category) {
  if (!category) return null;
  const catMap = {
    'sedan': 'sedan',
    'halvkombi': 'hatchback',
    'kombi': 'estate',
    'suv': 'suv',
    'cab': 'convertible',
    'cabriolet': 'convertible',
    'coupé': 'coupe',
    'coupe': 'coupe',
    'minibuss': 'minivan',
    'pickup': 'pickup',
    'transportbil': 'van',
    'skåpbil': 'van',
    'småbil': 'hatchback',
    'sportkupé': 'coupe',
    'familjebuss': 'mpv'
  };
  return catMap[category.toLowerCase()] || category;
}

function inferDoorsFromCategory(category) {
  if (!category) return null;
  const doorMap = {
    'sedan': 4, 'hatchback': 5, 'estate': 5, 'suv': 5,
    'coupe': 2, 'convertible': 2, 'minivan': 5, 'mpv': 5,
    'pickup': 4, 'van': 4
  };
  return doorMap[category.toLowerCase()] || null;
}

const KNOWN_TRIMS = new Set([
  // Volvo
  'inscription', 'momentum', 'r-design', 'summum', 'kinetic', 'ocean', 'core', 'pure', 'plus', 'ultra',
  // Ford
  'titanium', 'vignale', 'st-line', 'trend', 'active', 'st',
  // Volkswagen
  'r-line', 'highline', 'comfortline', 'trendline', 'life', 'elegance', 'style',
  // Audi
  'ambition', 'ambiente', 'business', 'premium', 'pro', 's line', 's-line',
  // Generic
  'sport', 'luxury', 'executive', 'edition', 'ultimate', 'gt', 'gt-line', 'gt line',
  // Nissan
  'tekna', 'acenta', 'n-connecta', 'visia',
  // Peugeot/Citroën
  'allure', 'feel', 'shine', 'flair',
  // Mercedes
  'amg', 'amg line', 'avantgarde', 'progressive', 'exclusive',
  // Hyundai/Kia
  'advance', 'se', 'sel', 'limited', 'platinum',
  // Seat/Cupra
  'xcellence', 'desire', 'reference', 'motion',
  // Special editions
  'first edition', 'launch edition', 'base',
  // Skoda
  'ambition', 'style', 'sportline', 'laurin & klement', 'l&k',
  // Toyota
  'comfort', 'executive', 'lounge',
  // BMW
  'm sport', 'm-sport', 'xline', 'x-line', 'luxury line', 'sport line',
  // Renault
  'zen', 'intens', 'initiale paris', 'iconic', 'techno', 'evolution', 'equilibre',
  // Opel
  'elegance', 'gs', 'gs line', 'ultimate',
  // Dacia
  'essential', 'expression', 'extreme', 'journey'
]);

function extractVersionTrim(specs) {
  const equipment = specs['utrustning'] || '';
  if (!equipment) return { version: null, trim: null };

  const items = equipment.split(',').map(s => s.trim()).filter(Boolean);

  let trim = null;
  let version = null;

  // Only exact matches against KNOWN_TRIMS (case-insensitive)
  for (let i = 0; i < Math.min(items.length, 3); i++) {
    if (KNOWN_TRIMS.has(items[i].toLowerCase())) {
      trim = items[i];
      break;
    }
  }

  // Version: drive configuration in first few items
  for (const item of items.slice(0, 5)) {
    if (item.match(/^(4motion|4matic|xdrive|quattro|e-hybrid|plug-in)$/i) ||
        item.match(/^(4Motion\/Fyrhjulsdrift|4Matic)$/i)) {
      version = item.replace(/\/.*$/, '');
      break;
    }
  }

  return { version, trim };
}
