import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getPriceHistory as getPriceHistoryFromTracker, getPriceDrops as getPriceDropsFromTracker } from './priceTracker.js';
import { getSalesStats, calculateDOM } from './saleDetector.js';
import { getTopSellingModels, calculateAverageDOM as calculateAvgDOM, getMedianSalePrice } from './velocityCalculator.js';

/**
 * Get price history for a listing
 */
export async function getPriceHistory(listingId) {
  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('listing_id', listingId)
      .order('recorded_at', { ascending: true });

    if (error) {
      logger.error('Error getting price history', { error: error.message, listingId });
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getPriceHistory', { error: error.message, listingId });
    throw error;
  }
}

/**
 * Record a price change for a listing
 */
export async function recordPriceChange(listingId, price) {
  try {
    // Check if this price is different from the last recorded price
    const { data: lastPrice, error: lastPriceError } = await supabase
      .from('price_history')
      .select('price')
      .eq('listing_id', listingId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPriceError && lastPriceError.code !== 'PGRST116') {
      logger.warn('Error checking last price', { error: lastPriceError.message, listingId });
    }

    // Only record if price changed
    if (!lastPrice || parseFloat(lastPrice.price) !== parseFloat(price)) {
      const { data, error } = await supabase
        .from('price_history')
        .insert({
          listing_id: listingId,
          price: parseFloat(price)
        })
        .select()
        .single();

      if (error) {
        logger.error('Error recording price change', { error: error.message, listingId, price });
        throw error;
      }

      logger.info('Price change recorded', { listingId, price, previousPrice: lastPrice?.price });
      return data;
    }

    return null; // No change recorded
  } catch (error) {
    logger.error('Error in recordPriceChange', { error: error.message, listingId, price });
    throw error;
  }
}

/**
 * Get price history with drops (wrapper for priceTracker)
 */
export async function getPriceHistoryWithDrops(listingId, minDropPct = 10) {
  return getPriceDropsFromTracker(listingId, minDropPct);
}

/**
 * Get price drops by model (wrapper)
 */
export async function getPriceDropsByModel(brand, model, days = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: listings, error } = await supabase
      .from('listings')
      .select('id')
      .ilike('brand', brand)
      .ilike('model', model)
      .eq('status', 'active');

    if (error) throw error;

    const allDrops = [];
    for (const listing of listings || []) {
      const drops = await getPriceDropsFromTracker(listing.id, 8);
      for (const drop of drops) {
        if (new Date(drop.recorded_at) >= cutoffDate) {
          allDrops.push({ listingId: listing.id, ...drop });
        }
      }
    }

    return allDrops.sort((a, b) => (b.drop_pct || 0) - (a.drop_pct || 0));
  } catch (error) {
    logger.error('Error getting price drops by model', { error: error.message, brand, model });
    throw error;
  }
}

/**
 * Calculate average DOM (wrapper for velocityCalculator)
 * Note: This is a wrapper to avoid naming conflict with velocityCalculator.calculateAverageDOM
 */
export async function getAverageDOM(brand, model, year = null) {
  return calculateAvgDOM(brand, model, year);
}

/**
 * Get undervalued listings (wrapper)
 */
export async function getUndervaluedListings(threshold = 0.10, domMin = 60) {
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, brand, model, year, price, mileage, price_drop_pct, price_drop_amount, dom_days, url, images')
      .eq('status', 'active')
      .gte('dom_days', domMin)
      .gte('price_drop_pct', threshold * 100)
      .not('price_drop_pct', 'is', null)
      .order('price_drop_pct', { ascending: false })
      .limit(20);

    if (error) throw error;

    return listings || [];
  } catch (error) {
    logger.error('Error getting undervalued listings', { error: error.message });
    throw error;
  }
}







