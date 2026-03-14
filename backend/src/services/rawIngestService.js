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
    case 'bilweb': {
      const match = item.url?.match(/\/bil\/(\d+)/) || item.url?.match(/\/car\/(\d+)/) || item.url?.match(/\/vehicle\/(\d+)/);
      return match ? match[1] : item.id || item.url || null;
    }
    case 'bytbil': {
      // New URL format: /location/brand-model-...-dealerId-listingId → last number
      const newMatch = item.url?.replace(/\/$/, '').match(/-(\d+)$/);
      if (newMatch) return newMatch[1];
      // Old format: /bil/12345
      const oldMatch = item.url?.match(/\/bil\/(\d+)/);
      if (oldMatch) return oldMatch[1];
      return item.id || item.source_listing_id || item.url || null;
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
      updated_at: now
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

/**
 * Delete processed raw_listings rows older than retentionDays.
 * Prevents unbounded table growth and reduces Disk IO from large index scans.
 * Only deletes rows that have already been processed (processed_at IS NOT NULL).
 *
 * @param {number} retentionDays - Keep processed rows for this many days (default: 7)
 * @returns {Promise<number>} Number of rows deleted
 */
export async function cleanupOldRawListings(retentionDays = 7) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { error, count } = await supabase
      .from('raw_listings')
      .delete({ count: 'exact' })
      .not('processed_at', 'is', null)
      .lt('processed_at', cutoffDate);

    if (error) {
      logger.error('raw_listings cleanup failed', { error: error.message, retentionDays });
      return 0;
    }
    const deleted = count || 0;
    if (deleted > 0) {
      logger.info('raw_listings cleanup completed', { deleted, retentionDays, cutoff: cutoffDate });
    }
    return deleted;
  } catch (err) {
    logger.error('raw_listings cleanup exception', { error: err.message });
    return 0;
  }
}
