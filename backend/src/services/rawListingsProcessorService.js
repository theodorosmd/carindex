import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import openaiService from './openaiService.js';
import { upsertListingsBatch } from './ingestService.js';
import { mapAutoscout24DataToListing } from './autoscout24Service.js';
import { mapMobileDeDataToListing } from './mobiledeService.js';
import { mapLeBonCoinDataToListing } from './leboncoinService.js';
import { mapBlocketDataToListing } from './blocketService.js';
import { mapBilwebDataToListing } from './bilwebService.js';
import { mapBytbilDataToListing } from './bytbilService.js';
import { mapLargusDataToListing } from './largusService.js';
import { mapLaCentraleDataToListing } from './laCentraleService.js';
import { mapSubitoDataToListing } from './subitoService.js';
import { mapGaspedaalDataToListing } from './gaspedaalService.js';
import { mapCochesNetDataToListing } from './cochesnetService.js';
import { mapMarktplaatsDataToListing } from './marktplaatsService.js';
import { map2ememainDataToListing } from './deuxememainService.js';
import { mapFinnDataToListing } from './finnService.js';
import { mapOtomotoDataToListing } from './otomotoService.js';

const MAPPERS = {
  autoscout24: (item) => mapAutoscout24DataToListing(item, 'autoscout24'),
  'mobile.de': (item) => mapMobileDeDataToListing(item, 'mobile.de'),
  mobile_de: (item) => mapMobileDeDataToListing(item, 'mobile.de'),
  mobilede: (item) => mapMobileDeDataToListing(item, 'mobile.de'),
  leboncoin: mapLeBonCoinDataToListing,
  blocket: mapBlocketDataToListing,
  bilweb: mapBilwebDataToListing,
  bytbil: mapBytbilDataToListing,
  largus: mapLargusDataToListing,
  lacentrale: mapLaCentraleDataToListing,
  subito: mapSubitoDataToListing,
  'coches.net': mapCochesNetDataToListing,
  gaspedaal: mapGaspedaalDataToListing,
  marktplaats: mapMarktplaatsDataToListing,
  '2ememain': map2ememainDataToListing,
  deuxememain: map2ememainDataToListing,
  finn: mapFinnDataToListing,
  otomoto: mapOtomotoDataToListing
};

/**
 * Stage 2 – Process raw_listings into listings
 * Applies platform-specific mappers and business logic, then upserts to listings
 *
 * @param {Object} options
 * @param {number} options.limit - Max raw listings to process (default 1000)
 * @param {string} [options.sourcePlatform] - Only process this platform
 * @returns {{ processed: number, created: number, updated: number, errors: number }}
 */
export async function processRawListings(options = {}) {
  const limit = options.limit ?? 1000;
  const sourcePlatform = options.sourcePlatform;

  let query = supabase
    .from('raw_listings')
    .select('id, source_platform, source_listing_id, raw_payload')
    .is('processed_at', null)
    .limit(limit)
    .order('scraped_at', { ascending: true });

  if (sourcePlatform) {
    query = query.eq('source_platform', sourcePlatform);
  }

  const { data: rawRows, error: fetchError } = await query;

  if (fetchError) {
    logger.error('Failed to fetch raw listings', { error: fetchError.message });
    throw fetchError;
  }

  if (!rawRows || rawRows.length === 0) {
    return { processed: 0, created: 0, updated: 0, errors: 0 };
  }

  const mappedListings = [];
  const processedIds = [];

  for (const row of rawRows) {
    try {
      const mapper = MAPPERS[row.source_platform];
      if (!mapper) {
        logger.warn('No mapper for platform', { source_platform: row.source_platform });
        continue;
      }

      let listing = mapper(row.raw_payload);
      if (!listing?.brand || !listing?.model || !listing?.price) {
        logger.debug('Mapper produced invalid listing, skipping', {
          source_platform: row.source_platform,
          source_listing_id: row.source_listing_id
        });
        continue;
      }

      const AI_ENRICHABLE = ['largus', 'leboncoin', 'marktplaats', '2ememain', 'finn', 'otomoto'];
      if (AI_ENRICHABLE.includes(row.source_platform) && process.env.OPENAI_API_KEY) {
        const hasMissing = !listing.transmission || listing.doors == null || !listing.color ||
          listing.power_hp == null || !listing.category || listing.displacement == null;
        if (hasMissing && listing.description) {
          try {
            const aiFilled = await openaiService.fillMissingListingFields(listing);
            for (const [k, v] of Object.entries(aiFilled)) {
              if (v != null && (listing[k] == null || listing[k] === '')) listing[k] = v;
            }
          } catch (err) {
            logger.debug('AI enrichment skipped', { source_platform: row.source_platform, source_listing_id: row.source_listing_id, error: err.message });
          }
        }
      }

      mappedListings.push({
        ...listing,
        source_platform: row.source_platform,
        source_listing_id: String(row.source_listing_id)
      });
      processedIds.push(row.id);
    } catch (err) {
      logger.warn('Error mapping raw listing', {
        id: row.id,
        source_platform: row.source_platform,
        error: err.message
      });
    }
  }

  if (mappedListings.length === 0) {
    return { processed: 0, created: 0, updated: 0, errors: rawRows.length };
  }

  const result = await upsertListingsBatch(mappedListings);

  if (processedIds.length > 0) {
    const { error: updateError } = await supabase
      .from('raw_listings')
      .update({
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', processedIds);

    if (updateError) {
      logger.error('Failed to mark raw listings as processed', { error: updateError.message });
    }
  }

  logger.info('Processed raw listings', {
    processed: processedIds.length,
    created: result.created,
    updated: result.updated,
    errors: result.errors
  });

  return {
    processed: processedIds.length,
    created: result.created,
    updated: result.updated,
    sourceAdded: result.sourceAdded || 0,
    errors: result.errors
  };
}
