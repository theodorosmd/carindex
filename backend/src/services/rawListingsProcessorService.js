import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import openaiService from './openaiService.js';
import { upsertListingsBatch } from './ingestService.js';
import { normalizeFuelType, normalizeTransmission } from '../utils/listingNormalize.js';
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

const MAX_SAFE_MILEAGE = 2_147_483_647; // PostgreSQL int4 max

const AI_ENRICHABLE = new Set(['largus', 'leboncoin', 'marktplaats', '2ememain', 'finn', 'otomoto']);

/**
 * Apply post-processing normalizations common to all sources:
 * - Mileage cap (PostgreSQL int4 safe range)
 * - Canonical fuel_type (DIESEL, PETROL, ELECTRIC, HYBRID, LPG, CNG)
 * - Canonical transmission (AUTOMATIC, MANUAL)
 */
function postProcess(listing) {
  if (listing.mileage != null) {
    const parsed = parseInt(listing.mileage, 10);
    listing.mileage = isNaN(parsed) ? null : Math.min(parsed, MAX_SAFE_MILEAGE);
  }
  if (listing.fuel_type) {
    listing.fuel_type = normalizeFuelType(listing.fuel_type);
  }
  if (listing.transmission) {
    listing.transmission = normalizeTransmission(listing.transmission);
  }
  return listing;
}

/**
 * Stage 2 – Process raw_listings into listings
 * Applies platform-specific mappers, post-processing normalization, parallel AI enrichment,
 * then upserts to listings.
 *
 * @param {Object} options
 * @param {number} options.limit - Max raw listings to process (default 1000)
 * @param {string} [options.sourcePlatform] - Only process this platform
 * @returns {{ processed: number, created: number, updated: number, skipped: number, errors: number }}
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
    return { processed: 0, created: 0, updated: 0, skipped: 0, errors: 0 };
  }

  const mappedListings = [];
  const processedIds = [];
  // Listings that need AI enrichment: [{listing (ref), rowInfo}]
  const enrichmentTargets = [];

  const aiEnabled = !(process.env.DISABLE_AI_ENRICHMENT === 'true') && !!process.env.OPENAI_API_KEY;

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

      // Post-processing: mileage cap + canonical fuel/transmission
      listing = postProcess(listing);

      listing = {
        ...listing,
        source_platform: row.source_platform,
        source_listing_id: String(row.source_listing_id)
      };

      // Collect AI enrichment candidates (don't await yet)
      if (aiEnabled && AI_ENRICHABLE.has(row.source_platform)) {
        const missingCritical = !listing.brand || !listing.model;
        const missingSpecs = [
          !listing.transmission,
          listing.doors == null,
          !listing.color,
          listing.power_hp == null,
          !listing.category,
          listing.displacement == null
        ].filter(Boolean).length;
        if ((missingCritical || missingSpecs >= 3) && listing.description) {
          enrichmentTargets.push(listing);
        }
      }

      mappedListings.push(listing);
      processedIds.push(row.id);
    } catch (err) {
      logger.warn('Error mapping raw listing', {
        id: row.id,
        source_platform: row.source_platform,
        error: err.message
      });
    }
  }

  // Parallel AI enrichment (batch concurrency to avoid overwhelming OpenAI)
  if (enrichmentTargets.length > 0) {
    const concurrency = parseInt(process.env.AI_ENRICHMENT_CONCURRENCY || '5', 10);
    for (let i = 0; i < enrichmentTargets.length; i += concurrency) {
      const batch = enrichmentTargets.slice(i, i + concurrency);
      await Promise.allSettled(batch.map(async (listing) => {
        try {
          const aiFilled = await openaiService.fillMissingListingFields(listing);
          for (const [k, v] of Object.entries(aiFilled)) {
            if (v != null && (listing[k] == null || listing[k] === '')) listing[k] = v;
          }
          // Re-normalize after AI fill (AI may return raw language values)
          if (listing.fuel_type) listing.fuel_type = normalizeFuelType(listing.fuel_type);
          if (listing.transmission) listing.transmission = normalizeTransmission(listing.transmission);
        } catch (err) {
          logger.debug('AI enrichment skipped', {
            source_platform: listing.source_platform,
            source_listing_id: listing.source_listing_id,
            error: err.message
          });
        }
      }));
    }
  }

  if (mappedListings.length === 0) {
    return { processed: 0, created: 0, updated: 0, skipped: 0, errors: rawRows.length };
  }

  const createOnly = options.createOnly === true || process.env.INGEST_CREATE_ONLY === 'true';
  const result = await upsertListingsBatch(mappedListings, { createOnly });

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
    aiEnriched: enrichmentTargets.length,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped || 0,
    errors: result.errors
  });

  return {
    processed: processedIds.length,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped || 0,
    sourceAdded: result.sourceAdded || 0,
    errors: result.errors
  };
}
