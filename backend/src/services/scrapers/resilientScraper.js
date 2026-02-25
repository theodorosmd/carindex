import { logger } from '../../utils/logger.js';

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        logger.error('Max retries reached', {
          maxRetries,
          error: error.message
        });
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt - 1);
      logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
        error: error.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Validate listing data quality
 */
export function validateListingData(listing) {
  const errors = [];

  // Required fields
  if (!listing.source_listing_id && !listing.id) {
    errors.push('Missing source_listing_id or id');
  }

  if (!listing.brand) {
    errors.push('Missing brand');
  }

  if (!listing.model) {
    errors.push('Missing model');
  }

  if (!listing.price || parseFloat(listing.price) <= 0) {
    errors.push('Invalid or missing price');
  }

  if (!listing.year || listing.year < 1900 || listing.year > new Date().getFullYear() + 1) {
    errors.push('Invalid year');
  }

  if (!listing.mileage || parseInt(listing.mileage) < 0) {
    errors.push('Invalid mileage');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalize listing ID for stable identification
 */
export function normalizeListingId(source, rawId) {
  if (!rawId) {
    return null;
  }

  // Remove common prefixes/suffixes
  let normalized = String(rawId).trim();

  // Remove URL fragments if present
  if (normalized.includes('#')) {
    normalized = normalized.split('#')[0];
  }

  // Remove query parameters if present
  if (normalized.includes('?')) {
    normalized = normalized.split('?')[0];
  }

  // Extract ID from URL if it's a full URL
  if (normalized.startsWith('http')) {
    try {
      const url = new URL(normalized);
      // Try to extract ID from pathname
      const pathParts = url.pathname.split('/').filter(p => p);
      if (pathParts.length > 0) {
        normalized = pathParts[pathParts.length - 1];
      }
    } catch (e) {
      // Not a valid URL, use as is
    }
  }

  return normalized;
}

/**
 * Deduplicate listings with similar IDs
 */
export function deduplicateListings(listings) {
  const seen = new Map();
  const deduplicated = [];

  for (const listing of listings) {
    const sourceId = normalizeListingId(
      listing.source_platform || listing.source,
      listing.source_listing_id || listing.id
    );

    if (!sourceId) {
      logger.warn('Listing without source ID, skipping', { listing });
      continue;
    }

    const key = `${listing.source_platform || listing.source}|${sourceId}`;

    if (!seen.has(key)) {
      seen.set(key, true);
      deduplicated.push({
        ...listing,
        source_listing_id: sourceId
      });
    } else {
      logger.debug('Duplicate listing skipped', { key, listing });
    }
  }

  return deduplicated;
}

/**
 * Process and validate a batch of listings
 */
export function processListings(listings, source) {
  const valid = [];
  const invalid = [];

  for (const listing of listings) {
    // Add source if missing
    if (!listing.source_platform && !listing.source) {
      listing.source_platform = source;
    }

    // Normalize ID
    const normalizedId = normalizeListingId(
      source,
      listing.source_listing_id || listing.id
    );

    if (normalizedId) {
      listing.source_listing_id = normalizedId;
    }

    // Validate
    const validation = validateListingData(listing);

    if (validation.isValid) {
      valid.push(listing);
    } else {
      invalid.push({
        listing,
        errors: validation.errors
      });
      logger.warn('Invalid listing data', {
        source,
        errors: validation.errors,
        listing: {
          id: listing.id,
          brand: listing.brand,
          model: listing.model
        }
      });
    }
  }

  // Deduplicate valid listings
  const deduplicated = deduplicateListings(valid);

  logger.info('Listings processed', {
    source,
    total: listings.length,
    valid: valid.length,
    invalid: invalid.length,
    deduplicated: deduplicated.length
  });

  return {
    valid: deduplicated,
    invalid
  };
}
