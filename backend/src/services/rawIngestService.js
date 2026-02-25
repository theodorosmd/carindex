import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Extract source_listing_id from raw payload (platform-specific)
 */
function extractSourceListingId(rawPayload, sourcePlatform) {
  const item = rawPayload;
  if (!item) return null;

  switch (sourcePlatform) {
    case 'autoscout24':
    case 'mobile.de':
    case 'mobile_de':
    case 'mobilede':
    case 'leboncoin': {
      if (item.ad_id) return String(item.ad_id);
      const urlMatch = item.url?.match(/\/details\/(\d+)/) || item.url?.match(/\/(\d+)/);
      return urlMatch ? urlMatch[1] : item.id || item.url || null;
    }
    case 'blocket': {
      const match = item.url?.match(/\/annonser\/[^/]+\/(\d+)/);
      return match ? match[1] : item.id || item.url || null;
    }
    case 'bilweb':
    case 'bytbil': {
      const match = item.url?.match(/\/bil\/(\d+)/) || item.url?.match(/\/car\/(\d+)/) || item.url?.match(/\/vehicle\/(\d+)/);
      return match ? match[1] : item.id || item.url || null;
    }
    case 'largus': {
      const match = item.url?.match(/annonce-([a-f0-9]+)_/i) || item.url?.match(/annonce-([^_]+)_/);
      return match ? match[1] : item.id || item.url || null;
    }
    default:
      return item.id || item.source_listing_id || item.url || null;
  }
}

/**
 * Stage 1 – Save raw scraped items to raw_listings as-is
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

  for (const item of items) {
    try {
      const sourceListingId = extractSourceListingId(item, sourcePlatform);
      if (!sourceListingId) {
        errors.push({
          item: item.url || item.id || 'unknown',
          error: 'Could not extract source_listing_id'
        });
        continue;
      }

      const { error } = await supabase
        .from('raw_listings')
        .upsert(
          {
            source_platform: sourcePlatform,
            source_listing_id: String(sourceListingId),
            run_id: runId || null,
            raw_payload: item,
            scraped_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            processed_at: null
          },
          {
            onConflict: 'source_platform,source_listing_id',
            ignoreDuplicates: false
          }
        );

      if (error) {
        throw error;
      }
      saved++;
    } catch (err) {
      logger.warn('Error saving raw listing', {
        sourcePlatform,
        item: item?.url || item?.id,
        error: err.message
      });
      errors.push({
        item: item?.url || item?.id || 'unknown',
        error: err.message
      });
    }
  }

  if (errors.length > 0) {
    logger.warn('Some raw listings failed to save', {
      sourcePlatform,
      saved,
      errors: errors.length
    });
  }

  return { saved, errors };
}
