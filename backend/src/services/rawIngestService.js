import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Extract source_listing_id from raw payload (platform-specific)
 */
function extractSourceListingId(rawPayload, sourcePlatform) {
  const item = rawPayload;
  if (!item) return null;

  switch (sourcePlatform) {
    case 'autoscout24': {
      if (item.id) return String(item.id);
      const uuidMatch = item.url?.match(/-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\?|$|\/)/i);
      if (uuidMatch) return uuidMatch[1];
      const numMatch = item.url?.match(/\/details\/(\d+)/) || item.url?.match(/\/(\d+)(?:\?|$)/);
      return numMatch ? numMatch[1] : item.url || null;
    }
    case 'mobile.de':
    case 'mobile_de':
    case 'mobilede':
    case 'leboncoin': {
      if (item.ad_id) return String(item.ad_id);
      const urlMatch = item.url?.match(/\/ad\/voitures\/(\d+)/) || item.url?.match(/\/details\/(\d+)/) || item.url?.match(/\/(\d+)(?:\?|$)/);
      return urlMatch ? urlMatch[1] : item.id || item.url || null;
    }
    case 'subito': {
      const match = item.url?.match(/-(\d{6,})\.htm/) || item.url?.match(/\/(\d+)(?:\?|$)/);
      return match ? match[1] : item.id || item.url || null;
    }
    case 'blocket': {
      const match =
        item.url?.match(/\/item\/(\d+)/) ||
        item.url?.match(/\/ad\/([a-z0-9-]+)/i) ||
        item.url?.match(/\/annonser\/[^/]+\/(\d+)/) ||
        item.url?.match(/\/(\d+)(?:\?|$)/);
      return match ? match[1] : item.id || item.url || null;
    }
    case 'bilweb':
    case 'bytbil': {
      const match = item.url?.match(/\/bil\/(\d+)/) || item.url?.match(/\/car\/(\d+)/) || item.url?.match(/\/vehicle\/(\d+)/);
      return match ? match[1] : item.id || item.url || null;
    }
    case 'finn': {
      const match = item.url?.match(/finnkode=(\d+)/) || item.url?.match(/\/ad\/(\d+)/);
      return match ? match[1] : item.id || item.url || null;
    }
    case 'largus': {
      const match = item.url?.match(/annonce-([a-f0-9]+)_/i) || item.url?.match(/annonce-([^_]+)_/);
      return match ? match[1] : item.id || item.url || null;
    }
    case 'coches.net': {
      const match = item.url?.match(/-(\d+)-covo\.aspx/);
      return match ? match[1] : item.id || item.url || null;
    }
    case 'otomoto': {
      const match = item.url?.match(/-ID([A-Za-z0-9]+)\.html/);
      return match ? match[1] : (item.id?.toString() || item.url || null);
    }
    case 'marktplaats': {
      const match = item.url?.match(/\/([am]\d{8,})-/i) || item.url?.match(/-([am]\d{8,})(?:-|$)/i);
      return match ? match[1] : item.id || item.url || null;
    }
    default:
      return item.id || item.source_listing_id || item.url || null;
  }
}

const BULK_BATCH_SIZE = Math.max(50, parseInt(process.env.RAW_INGEST_BATCH_SIZE || '200', 10));

/**
 * Stage 1 – Save raw scraped items to raw_listings as-is (bulk upsert)
 * No business logic, no mapping — just store the payload
 *
 * @param {Array} items - Raw items from scraper
 * @param {string} sourcePlatform - e.g. 'autoscout24', 'blocket', 'bilweb'
 * @param {string} [runId] - Optional scraper run UUID
 * @returns {{ saved: number, errors: number }}
 */
export async function saveRawListings(items, sourcePlatform, runId = null) {
  let saved = 0;
  const errors = [];
  const now = new Date().toISOString();

  const rows = [];
  for (const item of items) {
    const sourceListingId = extractSourceListingId(item, sourcePlatform);
    if (!sourceListingId) {
      errors.push({ item: item.url || item.id || 'unknown', error: 'Could not extract source_listing_id' });
      continue;
    }
    rows.push({
      source_platform: sourcePlatform,
      source_listing_id: String(sourceListingId),
      run_id: runId || null,
      raw_payload: item,
      scraped_at: now,
      updated_at: now,
      processed_at: null
    });
  }

  for (let i = 0; i < rows.length; i += BULK_BATCH_SIZE) {
    const batch = rows.slice(i, i + BULK_BATCH_SIZE);
    const { error } = await supabase
      .from('raw_listings')
      .upsert(batch, {
        onConflict: 'source_platform,source_listing_id',
        ignoreDuplicates: false
      });

    if (error) {
      logger.warn('Bulk save raw listings failed', { sourcePlatform, error: error.message, batchSize: batch.length });
      errors.push(...batch.map((r) => ({ item: r.source_listing_id, error: error.message })));
    } else {
      saved += batch.length;
    }
  }

  if (errors.length > 0) {
    logger.warn('Some raw listings failed to save', { sourcePlatform, saved, errors: errors.length });
  }

  return { saved, errors };
}
