import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getSalesStats } from './saleDetector.js';

/**
 * Calculate average Days On Market for a model
 */
export async function calculateAverageDOM(brand, model, year = null) {
  try {
    const stats = await getSalesStats(brand, model, year);
    return {
      averageDOM: stats.averageDOM,
      medianDOM: stats.medianDOM,
      totalSales: stats.totalSales
    };
  } catch (error) {
    logger.error('Error calculating average DOM', { error: error.message, brand, model, year });
    throw error;
  }
}

/**
 * Calculate sales velocity (number of sales per period)
 */
export async function calculateSalesVelocity(brand, model, days = 30, allowedCountries = null) {
  try {
    // Allowed countries for Market Insights (France and Sweden only)
    const ALLOWED_COUNTRIES = allowedCountries || ['FR', 'SE'];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: sales, error } = await supabase
      .from('listings')
      .select('id, sold_date')
      .eq('status', 'sold')
      .in('location_country', ALLOWED_COUNTRIES)
      .ilike('brand', brand)
      .ilike('model', model)
      .gte('sold_date', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to fetch sales: ${error.message}`);
    }

    const salesCount = sales?.length || 0;
    const velocity = (salesCount / days) * 30; // Normalize to per month

    return {
      brand,
      model,
      periodDays: days,
      salesCount,
      velocityPerMonth: Math.round(velocity * 10) / 10
    };
  } catch (error) {
    logger.error('Error calculating sales velocity', { error: error.message, brand, model });
    throw error;
  }
}

/**
 * Get top selling models (fastest selling)
 */
export async function getTopSellingModels(limit = 20, days = 30, country = null, year = null) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Allowed countries for Market Insights (France and Sweden only)
    const ALLOWED_COUNTRIES = ['FR', 'SE'];

    // Build query with optional filters (always limit to allowed countries)
    let query = supabase
      .from('listings')
      .select('id, brand, model, year, dom_days, price, sold_date, location_country')
      .eq('status', 'sold')
      .in('location_country', ALLOWED_COUNTRIES)
      .gte('sold_date', cutoffDate.toISOString())
      .not('dom_days', 'is', null)
      .gt('dom_days', 0);

    // Filter by country if provided (must be in allowed list)
    if (country && ALLOWED_COUNTRIES.includes(country.toUpperCase())) {
      query = query.eq('location_country', country.toUpperCase());
    }

    // Filter by year if provided
    if (year) {
      query = query.eq('year', parseInt(year));
    }

    const { data: soldListings, error } = await query;

    if (error) {
      if (error.code === '42703' || /column .* does not exist/i.test(error.message || '') || error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
        logger.warn('Missing table/column when fetching sold listings, returning empty results', {
          error: error.message
        });
        return [];
      }
      throw new Error(`Failed to fetch sold listings: ${error.message}`);
    }

    if (!soldListings || soldListings.length === 0) {
      return [];
    }

    // Group by brand + model + year
    const modelGroups = new Map();

    for (const listing of soldListings) {
      const key = `${listing.brand}|${listing.model}|${listing.year || 'all'}`;
      
      if (!modelGroups.has(key)) {
        modelGroups.set(key, {
          brand: listing.brand,
          model: listing.model,
          year: listing.year,
          sales: [],
          domDays: [],
          prices: []
        });
      }

      const group = modelGroups.get(key);
      group.sales.push(listing);
      if (listing.dom_days) {
        group.domDays.push(listing.dom_days);
      }
      if (listing.price) {
        group.prices.push(parseFloat(listing.price));
      }
    }

    // Calculate metrics for each model
    const models = Array.from(modelGroups.values()).map(group => {
      const domDays = group.domDays.sort((a, b) => a - b);
      const prices = group.prices.sort((a, b) => a - b);

      const averageDOM = domDays.length > 0
        ? Math.round(domDays.reduce((sum, d) => sum + d, 0) / domDays.length)
        : 0;

      const medianDOM = domDays.length > 0
        ? domDays[Math.floor(domDays.length / 2)]
        : 0;

      const medianPrice = prices.length > 0
        ? Math.round(prices[Math.floor(prices.length / 2)])
        : 0;

      // Get unique countries for this model group
      const countries = [...new Set(group.sales.map(s => s.location_country).filter(c => c))];

      return {
        brand: group.brand,
        model: group.model,
        year: group.year,
        salesCount: group.sales.length,
        averageDOM,
        medianDOM,
        medianPrice,
        velocityPerMonth: (group.sales.length / days) * 30,
        countries: countries.length > 0 ? countries : null // Countries where this model was sold
      };
    });

    // Sort by average DOM (fastest = lowest DOM)
    models.sort((a, b) => a.averageDOM - b.averageDOM);

    return models.slice(0, limit);
  } catch (error) {
    logger.error('Error getting top selling models', { error: error.message, limit, days, country, year });
    throw error;
  }
}

/**
 * Calculate conversion rate (% of listings sold vs total)
 */
export async function calculateConversionRate(brand, model, days = 90, allowedCountries = null) {
  try {
    // Allowed countries for Market Insights (France and Sweden only)
    const ALLOWED_COUNTRIES = allowedCountries || ['FR', 'SE'];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get total listings (active + sold) for this model
    const { data: totalListings, error: totalError } = await supabase
      .from('listings')
      .select('id, status')
      .in('location_country', ALLOWED_COUNTRIES)
      .ilike('brand', brand)
      .ilike('model', model)
      .gte('first_seen', cutoffDate.toISOString());

    if (totalError) {
      throw new Error(`Failed to fetch total listings: ${totalError.message}`);
    }

    // Get sold listings
    const { data: soldListings, error: soldError } = await supabase
      .from('listings')
      .select('id')
      .eq('status', 'sold')
      .in('location_country', ALLOWED_COUNTRIES)
      .ilike('brand', brand)
      .ilike('model', model)
      .gte('sold_date', cutoffDate.toISOString());

    if (soldError) {
      throw new Error(`Failed to fetch sold listings: ${soldError.message}`);
    }

    const total = totalListings?.length || 0;
    const sold = soldListings?.length || 0;
    const conversionRate = total > 0 ? (sold / total) * 100 : 0;

    return {
      brand,
      model,
      periodDays: days,
      totalListings: total,
      soldListings: sold,
      conversionRate: Math.round(conversionRate * 10) / 10
    };
  } catch (error) {
    logger.error('Error calculating conversion rate', { error: error.message, brand, model });
    throw error;
  }
}

/**
 * Get median sale price for a model
 */
export async function getMedianSalePrice(brand, model, year = null) {
  try {
    const stats = await getSalesStats(brand, model, year);
    return {
      brand,
      model,
      year,
      medianPrice: stats.medianPrice,
      averagePrice: stats.averagePrice,
      priceRange: stats.priceRange,
      totalSales: stats.totalSales
    };
  } catch (error) {
    logger.error('Error getting median sale price', { error: error.message, brand, model, year });
    throw error;
  }
}
