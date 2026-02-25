import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Track a price change in price_history table
 */
export async function trackPriceChange(listingId, newPrice, previousPrice = null) {
  try {
    const newPriceNum = parseFloat(newPrice);
    if (!newPriceNum || newPriceNum <= 0) {
      logger.warn('Invalid price for tracking', { listingId, newPrice });
      return null;
    }

    // If no previous price provided, get the last recorded price
    if (!previousPrice) {
      const { data: lastPrice, error } = await supabase
        .from('price_history')
        .select('price')
        .eq('listing_id', listingId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logger.warn('Error fetching last price', { error: error.message, listingId });
      } else if (lastPrice) {
        previousPrice = parseFloat(lastPrice.price);
      }
    } else {
      previousPrice = parseFloat(previousPrice);
    }

    // Calculate drop if previous price exists
    let dropAmount = null;
    let dropPct = null;

    if (previousPrice && previousPrice > 0) {
      dropAmount = previousPrice - newPriceNum;
      dropPct = (dropAmount / previousPrice) * 100;
    }

    // Only record if price changed or it's the first record
    if (previousPrice && previousPrice === newPriceNum) {
      logger.debug('Price unchanged, skipping history record', { listingId, price: newPriceNum });
      return null;
    }

    // Insert into price_history
    const { data, error } = await supabase
      .from('price_history')
      .insert({
        listing_id: listingId,
        price: newPriceNum,
        previous_price: previousPrice || null,
        drop_amount: dropAmount && dropAmount > 0 ? dropAmount : null,
        drop_pct: dropPct && dropPct > 0 ? dropPct : null
      })
      .select()
      .single();

    if (error) {
      logger.error('Error tracking price change', { error: error.message, listingId, newPrice });
      throw error;
    }

    // Update listing with latest drop info if it's a drop
    if (dropAmount && dropAmount > 0) {
      await supabase
        .from('listings')
        .update({
          price_drop_amount: dropAmount,
          price_drop_pct: dropPct,
          last_price_drop_date: new Date().toISOString()
        })
        .eq('id', listingId);
    }

    logger.info('Price change tracked', {
      listingId,
      newPrice: newPriceNum,
      previousPrice,
      dropAmount,
      dropPct
    });

    return data;
  } catch (error) {
    logger.error('Error in trackPriceChange', { error: error.message, listingId, newPrice });
    throw error;
  }
}

/**
 * Get price history for a listing
 */
export async function getPriceHistory(listingId, days = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('price_history')
      .select('price, recorded_at, drop_amount, drop_pct, previous_price')
      .eq('listing_id', listingId)
      .gte('recorded_at', cutoffDate.toISOString())
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
 * Get only price drops (significant decreases)
 */
export async function getPriceDrops(listingId, minDropPct = 10) {
  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('price, recorded_at, drop_amount, drop_pct, previous_price')
      .eq('listing_id', listingId)
      .not('drop_pct', 'is', null)
      .gte('drop_pct', minDropPct)
      .order('recorded_at', { ascending: false });

    if (error) {
      logger.error('Error getting price drops', { error: error.message, listingId });
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getPriceDrops', { error: error.message, listingId });
    throw error;
  }
}

/**
 * Calculate price trend (increasing, decreasing, stable)
 */
export async function calculatePriceTrend(listingId, days = 30) {
  try {
    const history = await getPriceHistory(listingId, days);

    if (history.length < 2) {
      return {
        trend: 'insufficient_data',
        change: 0,
        changePct: 0,
        dataPoints: history.length
      };
    }

    const firstPrice = parseFloat(history[0].price);
    const lastPrice = parseFloat(history[history.length - 1].price);
    const change = lastPrice - firstPrice;
    const changePct = firstPrice > 0 ? (change / firstPrice) * 100 : 0;

    let trend = 'stable';
    if (changePct > 2) {
      trend = 'increasing';
    } else if (changePct < -2) {
      trend = 'decreasing';
    }

    return {
      trend,
      change,
      changePct,
      firstPrice,
      lastPrice,
      dataPoints: history.length
    };
  } catch (error) {
    logger.error('Error calculating price trend', { error: error.message, listingId });
    throw error;
  }
}
