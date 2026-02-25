import { supabase } from '../config/supabase.js';
import { upsertListingsBatch } from '../services/ingestService.js';
import {
  loginDjango,
  fetchWithCookies,
  mapDjangoCarToListing
} from '../jobs/djangoImportJob.js';

const DEFAULT_PAGE_SIZE = 200;
const SOURCE_PLATFORMS = ['bytbil', 'blocket', 'bilweb'];
const SCRAPE_MISSING_IMAGES = process.env.DJANGO_REFRESH_SCRAPE_IMAGES === '1';

async function fetchOgImage(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const ogMatch = html.match(/property="og:image" content="([^"]+)"/i);
    if (ogMatch?.[1]) {
      return ogMatch[1];
    }
    const twitterMatch = html.match(/name="twitter:image" content="([^"]+)"/i);
    if (twitterMatch?.[1]) {
      return twitterMatch[1];
    }
    const bbcdnMatch = html.match(/https:\/\/pro\.bbcdn\.io[^"\s]+/i);
    return bbcdnMatch?.[0] || null;
  } catch (error) {
    console.warn('Failed to fetch og:image:', url, error?.message || error);
    return null;
  }
}

function isMissingMedia(listing) {
  const urlMissing = !listing.url || String(listing.url).trim() === '';
  const imagesMissing = !Array.isArray(listing.images) || listing.images.length === 0;
  return urlMissing || imagesMissing;
}

async function run() {
  const baseUrl = process.env.DJANGO_API_BASE_URL || 'http://75.119.141.234:8000';
  const pageSize = parseInt(process.env.DJANGO_REFRESH_BATCH || DEFAULT_PAGE_SIZE, 10);

  const cookies = await loginDjango();

  const { data: missingListings, error: missingError } = await supabase
    .from('listings')
    .select('id, source_platform, source_listing_id, url, images, specifications')
    .in('source_platform', SOURCE_PLATFORMS);

  if (missingError) {
    throw missingError;
  }

  const missing = (missingListings || []).filter(isMissingMedia);
  const regFilter = process.env.DJANGO_REFRESH_REG_NUMBERS
    ? process.env.DJANGO_REFRESH_REG_NUMBERS
        .split(',')
        .map(item => item.trim().toUpperCase())
        .filter(Boolean)
    : [];

  const missingSourceIds = new Set();
  const missingRegNumbers = new Set(regFilter);

  if (regFilter.length === 0) {
    for (const item of missing) {
      const sourceId = String(item.source_listing_id || '').trim();
      if (sourceId) {
        missingSourceIds.add(sourceId);
      }

      const reg = String(item.specifications?.reg_number || '').trim().toUpperCase();
      if (reg) {
        missingRegNumbers.add(reg);
      }
    }
  }

  let totalChecked = 0;
  let totalUpdated = 0;
  let totalMissing = missing.length;
  let nextUrl = `${baseUrl}/api/cars/?limit=${pageSize}`;
  let page = 0;

  if (missingSourceIds.size === 0 && missingRegNumbers.size === 0) {
    console.log(JSON.stringify({ checked: 0, missing: 0, updated: 0 }, null, 2));
    return;
  }

  while (nextUrl) {
    page += 1;
    const { response } = await fetchWithCookies(nextUrl, {}, cookies);
    if (!response.ok) {
      throw new Error(`Failed to fetch Django cars page ${page} (${response.status})`);
    }

    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    nextUrl = payload?.next || null;

    totalChecked += results.length;

    const mapped = [];
    for (const car of results) {
      const sourceId = String(car?.source_id || '').trim();
      const reg = String(car?.reg_number || '').trim().toUpperCase();
      let shouldMap = false;

      if (reg && missingRegNumbers.has(reg)) {
        shouldMap = true;
        missingRegNumbers.delete(reg);
      }

      if (sourceId && missingSourceIds.has(sourceId)) {
        shouldMap = true;
        missingSourceIds.delete(sourceId);
      }

      if (!shouldMap) {
        continue;
      }

      const listing = mapDjangoCarToListing(car);

      if (SCRAPE_MISSING_IMAGES && (!listing.images || listing.images.length === 0) && listing.url) {
        const ogImage = await fetchOgImage(listing.url);
        if (ogImage) {
          listing.images = [ogImage];
        }
      }

      mapped.push(listing);
    }

    if (mapped.length > 0) {
      const result = await upsertListingsBatch(mapped, { allowMissingRequired: true });
      totalUpdated += result.updated + result.created;
    }

    if (missingSourceIds.size === 0 && missingRegNumbers.size === 0) {
      break;
    }
  }

  console.log(JSON.stringify({
    checked: totalChecked,
    missing: totalMissing,
    updated: totalUpdated
  }, null, 2));
}

run().catch((error) => {
  console.error('Failed to refresh missing media:', error);
  process.exit(1);
});
