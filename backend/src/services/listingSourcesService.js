import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Compute a fingerprint for cross-platform deduplication.
 * Same car (brand, model, year, mileage, country) from different scrapers = same fingerprint.
 * Mileage tolerance ±2% to handle rounding differences.
 */
export function computeFingerprint(listing) {
  const brand = (listing.brand || '').toString().toLowerCase().trim();
  const model = (listing.model || '').toString().toLowerCase().trim();
  const year = parseInt(listing.year, 10) || 0;
  const mileage = parseInt(listing.mileage, 10) || 0;
  const country = (listing.location_country || '').toString().toUpperCase().slice(0, 2);
  if (!brand || !model || !country) return null;
  return `fp:${brand}|${model}|${year}|${mileage}|${country}`;
}

/**
 * Normalize fuel_type for fingerprint matching (diesel, petrol, electric, hybrid).
 */
function normalizeFuel(fuel) {
  if (!fuel) return null;
  const f = String(fuel).toLowerCase();
  if (f.includes('diesel')) return 'diesel';
  if (f.includes('petrol') || f.includes('essence') || f.includes('gasoline') || f.includes('benzine')) return 'petrol';
  if (f.includes('electric') || f.includes('electrique') || f.includes('ev')) return 'electric';
  if (f.includes('hybrid') || f.includes('hybride') || f.includes('plug')) return 'hybrid';
  return f;
}

/**
 * Normalize transmission for fingerprint matching.
 */
function normalizeTransmission(trans) {
  if (!trans) return null;
  const t = String(trans).toLowerCase();
  if (t.includes('auto')) return 'automatic';
  if (t.includes('manu') || t.includes('bvm') || t.includes('stick')) return 'manual';
  return t;
}

/**
 * Find listing by fingerprint match (same car from different platform).
 * Mileage tolerance: ±2% or ±2000 km. Optional: fuel_type + transmission for stricter matching.
 */
export async function findListingByFingerprint(listing, excludePlatform) {
  const brand = (listing.brand || '').toString().toLowerCase();
  const model = (listing.model || '').toString().toLowerCase();
  const year = parseInt(listing.year, 10) || 0;
  const mileage = parseInt(listing.mileage, 10) || 0;
  const country = (listing.location_country || '').toString().toUpperCase().slice(0, 2);
  const fuelNorm = normalizeFuel(listing.fuel_type || listing.fuel);
  const transNorm = normalizeTransmission(listing.transmission);

  if (!brand || !model || !country) return null;

  const mileageMin = Math.max(0, mileage - Math.max(2000, mileage * 0.02));
  const mileageMax = mileage + Math.max(2000, mileage * 0.02);

  let query = supabase
    .from('listings')
    .select('id, source_platform, mileage, fuel_type, transmission')
    .eq('brand', brand)
    .eq('model', model)
    .eq('year', year)
    .eq('location_country', country)
    .gte('mileage', mileageMin)
    .lte('mileage', mileageMax)
    .eq('status', 'active')
    .neq('source_platform', excludePlatform)
    .limit(10);

  const { data: candidates, error } = await query;

  if (error || !candidates?.length) return null;

  // Filter by fuel + transmission when available (stricter match)
  const filtered = fuelNorm || transNorm
    ? candidates.filter((c) => {
        if (fuelNorm) {
          const cf = normalizeFuel(c.fuel_type);
          if (cf && fuelNorm !== cf) return false;
        }
        if (transNorm) {
          const ct = normalizeTransmission(c.transmission);
          if (ct && transNorm !== ct) return false;
        }
        return true;
      })
    : candidates;

  return filtered[0] || candidates[0];
}

/**
 * Get listing_id by (source_platform, source_listing_id).
 */
export async function getListingIdBySource(platform, sourceListingId) {
  try {
    const { data, error } = await supabase
      .from('listing_sources')
      .select('listing_id')
      .eq('source_platform', platform)
      .eq('source_listing_id', String(sourceListingId))
      .maybeSingle();

    if (error || !data) return null;
    return data.listing_id;
  } catch {
    return null;
  }
}

/**
 * Add or update a source link for a listing.
 */
export async function upsertListingSource(listingId, platform, sourceListingId, url) {
  const { error } = await supabase
    .from('listing_sources')
    .upsert(
      {
        listing_id: listingId,
        source_platform: platform,
        source_listing_id: String(sourceListingId),
        url: url || null
      },
      { onConflict: 'source_platform,source_listing_id' }
    );

  if (error) {
    logger.warn('Failed to upsert listing source', {
      listingId,
      platform,
      sourceListingId,
      error: error.message
    });
    return false;
  }
  return true;
}

/**
 * Get all sources (platform + url) for a listing.
 */
export async function getListingSources(listingId) {
  const { data, error } = await supabase
    .from('listing_sources')
    .select('source_platform, source_listing_id, url')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}
