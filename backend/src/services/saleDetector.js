import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Mark a listing as sold
 */
export async function markAsSold(listingId, soldDate = null) {
  try {
    // Get listing to calculate DOM and get last price
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('id, first_seen, sold_date, status, price, created_at')
      .eq('id', listingId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch listing: ${fetchError.message}`);
    }

    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    if (listing.status === 'sold') {
      logger.debug('Listing already marked as sold', { listingId });
      return listing;
    }

    const soldDateValue = soldDate || new Date().toISOString();
    const firstSeen = listing.first_seen ? new Date(listing.first_seen) : new Date(listing.created_at);
    const soldDateObj = new Date(soldDateValue);
    const domDays = Math.floor((soldDateObj - firstSeen) / (1000 * 60 * 60 * 24));

    // Get last price from price_history (most recent before sold_date)
    let lastPrice = listing.price; // Fallback to current price
    try {
      const { data: priceHistory } = await supabase
        .from('price_history')
        .select('price')
        .eq('listing_id', listingId)
        .lte('recorded_at', soldDateValue)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priceHistory) {
        lastPrice = parseFloat(priceHistory.price);
      }
    } catch (priceError) {
      logger.warn('Error fetching last price from history', { listingId, error: priceError.message });
      // Use current price as fallback
    }

    // Update listing with last price before sale
    const { data: updated, error } = await supabase
      .from('listings')
      .update({
        status: 'sold',
        sold_date: soldDateValue,
        dom_days: domDays,
        price: lastPrice, // Update with last known price
        updated_at: new Date().toISOString()
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error) {
      logger.error('Error marking listing as sold', { error: error.message, listingId });
      throw error;
    }

    logger.info('Listing marked as sold', {
      listingId,
      soldDate: soldDateValue,
      domDays,
      firstSeen: listing.first_seen
    });

    return updated;
  } catch (error) {
    logger.error('Error in markAsSold', { error: error.message, listingId });
    throw error;
  }
}

/**
 * Calculate Days On Market (DOM) for a listing
 */
export async function calculateDOM(listingId) {
  try {
    const { data: listing, error } = await supabase
      .from('listings')
      .select('id, first_seen, sold_date, status, created_at')
      .eq('id', listingId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch listing: ${error.message}`);
    }

    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    const firstSeen = listing.first_seen 
      ? new Date(listing.first_seen) 
      : (listing.created_at ? new Date(listing.created_at) : new Date());

    const endDate = listing.sold_date 
      ? new Date(listing.sold_date) 
      : new Date();

    const domDays = Math.floor((endDate - firstSeen) / (1000 * 60 * 60 * 24));

    // Update DOM in database if listing is active
    if (listing.status === 'active' && listing.dom_days !== domDays) {
      await supabase
        .from('listings')
        .update({ dom_days: domDays })
        .eq('id', listingId);
    }

    return {
      listingId,
      domDays,
      firstSeen: firstSeen.toISOString(),
      endDate: endDate.toISOString(),
      isSold: listing.status === 'sold'
    };
  } catch (error) {
    logger.error('Error calculating DOM', { error: error.message, listingId });
    throw error;
  }
}

/**
 * Detect and mark sales from disappeared listings
 */
export async function detectSales(disappearedListings) {
  try {
    const results = {
      markedAsSold: [],
      errors: []
    };

    for (const disappeared of disappearedListings) {
      try {
        const sold = await markAsSold(disappeared.listingId);
        results.markedAsSold.push({
          listingId: disappeared.listingId,
          sourceListingId: disappeared.sourceListingId,
          lastPrice: disappeared.lastPrice,
          soldDate: sold.sold_date,
          domDays: sold.dom_days
        });
      } catch (error) {
        results.errors.push({
          listingId: disappeared.listingId,
          error: error.message
        });
        logger.error('Error marking listing as sold', {
          listingId: disappeared.listingId,
          error: error.message
        });
      }
    }

    logger.info('Sales detection completed', {
      total: disappearedListings.length,
      markedAsSold: results.markedAsSold.length,
      errors: results.errors.length
    });

    return results;
  } catch (error) {
    logger.error('Error in detectSales', { error: error.message });
    throw error;
  }
}

/**
 * Get sales statistics for a model
 */
export async function getSalesStats(brand, model, year = null, allowedCountries = null) {
  try {
    // Allowed countries for Market Insights (France and Sweden only)
    const ALLOWED_COUNTRIES = allowedCountries || ['FR', 'SE'];
    
    let query = supabase
      .from('listings')
      .select('id, price, sold_date, dom_days, first_seen, location_country')
      .eq('status', 'sold')
      .in('location_country', ALLOWED_COUNTRIES)
      .ilike('brand', brand)
      .ilike('model', model);

    if (year) {
      query = query.eq('year', year);
    }

    const { data: soldListings, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch sales stats: ${error.message}`);
    }

    if (!soldListings || soldListings.length === 0) {
      return {
        brand,
        model,
        year,
        totalSales: 0,
        averageDOM: 0,
        medianDOM: 0,
        averagePrice: 0,
        medianPrice: 0
      };
    }

    const prices = soldListings
      .map(l => parseFloat(l.price || 0))
      .filter(p => p > 0)
      .sort((a, b) => a - b);

    const domDays = soldListings
      .map(l => l.dom_days || 0)
      .filter(d => d > 0)
      .sort((a, b) => a - b);

    const averagePrice = prices.length > 0
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
      : 0;

    const medianPrice = prices.length > 0
      ? prices[Math.floor(prices.length / 2)]
      : 0;

    const averageDOM = domDays.length > 0
      ? domDays.reduce((sum, d) => sum + d, 0) / domDays.length
      : 0;

    const medianDOM = domDays.length > 0
      ? domDays[Math.floor(domDays.length / 2)]
      : 0;

    return {
      brand,
      model,
      year,
      totalSales: soldListings.length,
      averageDOM: Math.round(averageDOM),
      medianDOM: Math.round(medianDOM),
      averagePrice: Math.round(averagePrice),
      medianPrice: Math.round(medianPrice),
      priceRange: {
        min: prices[0] || 0,
        max: prices[prices.length - 1] || 0
      },
      domRange: {
        min: domDays[0] || 0,
        max: domDays[domDays.length - 1] || 0
      }
    };
  } catch (error) {
    logger.error('Error getting sales stats', { error: error.message, brand, model, year });
    throw error;
  }
}
