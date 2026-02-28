import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { recordPriceChange } from './priceHistoryService.js';
import {
  getListingIdBySource,
  findListingByFingerprint,
  upsertListingSource
} from './listingSourcesService.js';

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isNaN(num) ? null : num;
}

function parseInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseInt(String(value).replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(num) ? null : num;
}

function parseJsonField(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return null;
}

const LHD_COUNTRIES = ['FR', 'DE', 'IT', 'ES', 'PT', 'BE', 'NL', 'AT', 'CH', 'LU', 'PL', 'CZ', 'SK', 'HU', 'RO', 'GR', 'SE', 'NO', 'DK', 'FI'];

function normalizeListing(input) {
  const now = new Date().toISOString();

  const rawYear = parseInteger(input.year);
  const rawMileage = parseInteger(input.mileage);
  const country = input.location_country
    ? String(input.location_country).toUpperCase().slice(0, 2)
    : null;

  const steering = input.steering || (country && LHD_COUNTRIES.includes(country) ? 'LHD' : null);
  const src = String(input.source_platform || '').toLowerCase();
  const sellerType = input.seller_type || (['largus', 'mobile.de', 'mobilede', 'autoscout24'].includes(src) ? 'professional' : null);

  return {
    source_platform: input.source_platform,
    source_listing_id: input.source_listing_id,
    brand: input.brand,
    model: input.model,
    year: rawYear ?? 2000,
    mileage: rawMileage ?? 0,
    price: parseNumber(input.price),
    currency: input.currency || 'EUR',
    location_city: input.location_city || null,
    location_region: input.location_region || (country === 'FR' ? 'France' : country === 'DE' ? 'Allemagne' : null),
    location_country: country,
    location_latitude: parseNumber(input.location_latitude),
    location_longitude: parseNumber(input.location_longitude),
    seller_type: sellerType,
    fuel_type: input.fuel_type || null,
    transmission: input.transmission || null,
    steering,
    doors: parseInteger(input.doors),
    color: input.color || null,
    power_hp: parseInteger(input.power_hp),
    displacement: parseNumber(input.displacement),
    version: input.version || null,
    trim: input.trim || null,
    category: input.category || null,
    drivetrain: input.drivetrain || null,
    url: input.url || null,
    images: Array.isArray(input.images) ? input.images : (parseJsonField(input.images) || []),
    specifications: (() => {
      const s = parseJsonField(input.specifications) || input.specifications;
      if (s && typeof s === 'object') return s;
      return {};
    })(),
    description: input.description || null,
    posted_date: input.posted_date || null,
    status: input.status || 'active',
    fingerprint: input.fingerprint || null,
    run_id: input.run_id || null,
    first_seen: input.first_seen || now,
    last_seen: input.last_seen || now,
    updated_at: now
  };
}

function isUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

function validateRequiredFields(listing, options = {}) {
  const required = options.allowMissingRequired
    ? ['source_platform', 'source_listing_id', 'location_country']
    : ['source_platform', 'source_listing_id', 'brand', 'model', 'price', 'url', 'location_country'];
  const missing = required.filter((field) => !listing[field]);
  return missing;
}

function validateListingFields(listing) {
  const errors = [];

  if (listing.url && !isUrl(listing.url)) {
    errors.push('url must be a valid http(s) URL');
  }

  if (listing.year !== null && (listing.year < 1950 || listing.year > 2100)) {
    errors.push('year must be between 1950 and 2100');
  }

  if (listing.mileage !== null && (listing.mileage < 0 || listing.mileage > 1_000_000)) {
    errors.push('mileage must be between 0 and 1,000,000');
  }

  if (listing.price !== null && (listing.price < 0 || listing.price > 10_000_000)) {
    errors.push('price must be between 0 and 10,000,000');
  }

  if (listing.doors !== null && (listing.doors < 2 || listing.doors > 6)) {
    errors.push('doors must be between 2 and 6');
  }

  if (listing.power_hp !== null && (listing.power_hp < 20 || listing.power_hp > 2000)) {
    errors.push('power_hp must be between 20 and 2000');
  }

  if (listing.displacement !== null && (listing.displacement < 0 || listing.displacement > 10_000)) {
    errors.push('displacement must be between 0 and 10000');
  }

  if (listing.location_latitude !== null && (listing.location_latitude < -90 || listing.location_latitude > 90)) {
    errors.push('location_latitude must be between -90 and 90');
  }

  if (listing.location_longitude !== null && (listing.location_longitude < -180 || listing.location_longitude > 180)) {
    errors.push('location_longitude must be between -180 and 180');
  }

  if (listing.images && !Array.isArray(listing.images)) {
    errors.push('images must be an array');
  }

  if (listing.specifications && typeof listing.specifications !== 'object') {
    errors.push('specifications must be an object');
  }

  if (listing.status && !['active', 'sold', 'removed'].includes(listing.status)) {
    errors.push('status must be active, sold, or removed');
  }

  if (listing.run_id && !/^[0-9a-f-]{36}$/i.test(listing.run_id)) {
    errors.push('run_id must be a valid UUID');
  }

  return errors;
}

/**
 * Fast bulk upsert - single DB round-trip per batch. Use for Django import.
 * Skips per-row price_history (faster). Does not preserve first_seen on update.
 */
async function upsertListingsBulk(listings, options = {}) {
  const valid = [];
  const results = { created: 0, updated: 0, errors: 0, items: [] };

  for (const input of listings) {
    const listing = normalizeListing(input);
    const missing = validateRequiredFields(listing, options);
    if (missing.length > 0) {
      results.errors += 1;
      continue;
    }
    const fieldErrors = validateListingFields(listing);
    if (fieldErrors.length > 0) {
      results.errors += 1;
      continue;
    }
    valid.push(listing);
  }

  if (valid.length === 0) return results;

  const { data, error } = await supabase
    .from('listings')
    .upsert(valid, {
      onConflict: 'source_platform,source_listing_id',
      ignoreDuplicates: false
    })
    .select('id, source_platform, source_listing_id');

  if (error) {
    logger.warn('Bulk upsert failed, falling back to per-row', { error: error.message });
    return upsertListingsBatch(listings, { ...options, useBulkUpsert: false });
  }

  results.updated = data?.length || 0;
  return results;
}

export async function upsertListingsBatch(listings, options = {}) {
  if (options.useBulkUpsert && listings.length > 1) {
    return upsertListingsBulk(listings, options);
  }

  const results = {
    created: 0,
    updated: 0,
    sourceAdded: 0, // new: added as extra source to existing listing
    errors: 0,
    items: []
  };

  for (const input of listings) {
    try {
      const listing = normalizeListing(input);
      const missing = validateRequiredFields(listing, options);
      if (missing.length > 0) {
        results.errors += 1;
        results.items.push({
          source_platform: listing.source_platform,
          source_listing_id: listing.source_listing_id,
          status: 'error',
          error: `Missing required fields: ${missing.join(', ')}`
        });
        continue;
      }

      const fieldErrors = validateListingFields(listing);
      if (fieldErrors.length > 0) {
        results.errors += 1;
        results.items.push({
          source_platform: listing.source_platform,
          source_listing_id: listing.source_listing_id,
          status: 'error',
          error: `Invalid fields: ${fieldErrors.join('; ')}`
        });
        continue;
      }

      const platform = listing.source_platform;
      const sourceId = listing.source_listing_id;

      // 1. Check listing_sources: same ad already linked?
      let listingId = await getListingIdBySource(platform, sourceId);

      // 2. Fallback: check listings directly (legacy / before migration)
      if (!listingId) {
        const { data: leg, error: legErr } = await supabase
          .from('listings')
          .select('id, price, first_seen')
          .eq('source_platform', platform)
          .eq('source_listing_id', sourceId)
          .maybeSingle();
        if (!legErr && leg) listingId = leg.id;
      }

      if (listingId) {
        // Ad already exists – update listing
        const { data: existing } = await supabase
          .from('listings')
          .select('id, price, first_seen')
          .eq('id', listingId)
          .single();

        if (existing) {
          const { source_platform: _sp, source_listing_id: _sl, ...listingUpdate } = listing;
          const { error: updateError } = await supabase
            .from('listings')
            .update({
              ...listingUpdate,
              first_seen: existing.first_seen || listing.first_seen,
              last_seen: listing.last_seen || new Date().toISOString(),
              run_id: listing.run_id || undefined
            })
            .eq('id', listingId);

          if (updateError) throw updateError;

          await upsertListingSource(listingId, platform, sourceId, listing.url);

          results.updated += 1;
          results.items.push({
            id: listingId,
            source_platform: platform,
            source_listing_id: sourceId,
            status: 'updated'
          });

          if (listing.price && existing.price !== listing.price) {
            try {
              await recordPriceChange(listingId, listing.price);
            } catch (priceError) {
              logger.warn('Failed to record price change', { error: priceError.message, listingId });
            }
          }
        }
        continue;
      }

      // 3. Cross-platform match: same car from another scraper?
      const fingerprintMatch = await findListingByFingerprint(listing, platform);

      if (fingerprintMatch) {
        // Add this source to the existing listing
        const added = await upsertListingSource(
          fingerprintMatch.id,
          platform,
          sourceId,
          listing.url
        );
        if (!added) {
          results.errors += 1;
          continue;
        }

        const { data: existing } = await supabase
          .from('listings')
          .select('id, price, first_seen')
          .eq('id', fingerprintMatch.id)
          .single();

        if (existing) {
          const { error: updateError } = await supabase
            .from('listings')
            .update({
              price: listing.price ?? undefined,
              last_seen: new Date().toISOString(),
              url: existing.url || listing.url,
              images: undefined,
              updated_at: new Date().toISOString()
            })
            .eq('id', fingerprintMatch.id);

          if (updateError) throw updateError;
        }

        results.sourceAdded += 1;
        results.items.push({
          id: fingerprintMatch.id,
          source_platform: platform,
          source_listing_id: sourceId,
          status: 'source_added'
        });
        continue;
      }

      // 4. New listing – create and add first source
      const { data: created, error: insertError } = await supabase
        .from('listings')
        .insert({
          ...listing,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      await upsertListingSource(created.id, platform, sourceId, listing.url);

      results.created += 1;
      results.items.push({
        id: created.id,
        source_platform: platform,
        source_listing_id: sourceId,
        status: 'created'
      });

      if (listing.price) {
        try {
          await recordPriceChange(created.id, listing.price);
        } catch (priceError) {
          logger.warn('Failed to record initial price', { error: priceError.message, listingId: created.id });
        }
      }
    } catch (error) {
      results.errors += 1;
      results.items.push({
        source_platform: input?.source_platform,
        source_listing_id: input?.source_listing_id,
        status: 'error',
        error: error.message
      });
    }
  }

  return results;
}
