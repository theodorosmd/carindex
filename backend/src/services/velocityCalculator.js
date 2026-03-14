import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getSalesStats } from './saleDetector.js';
import { toEUR, AGGREGATE_COUNTRIES } from '../config/aggregateCountries.js';

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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let query = supabase
      .from('listings')
      .select('id, sold_date')
      .eq('status', 'sold')
      .ilike('brand', brand)
      .ilike('model', model)
      .gte('sold_date', cutoffDate.toISOString());

    if (allowedCountries && allowedCountries.length > 0) {
      query = query.in('location_country', allowedCountries);
    }

    const { data: sales, error } = await query;

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
 * When country is null, fetches from all aggregate countries (FR, DE, NO, FI, DK, NL, BE, LU, ES, IT, CH, PL).
 */
export async function getTopSellingModels(limit = 20, days = 30, country = null, year = null) {
  try {
    return getTopSellingModelsInternal(limit, days, country, year);
  } catch (error) {
    logger.error('Error getting top selling models', { error: error.message, limit, days, country, year });
    throw error;
  }
}

async function getTopSellingModelsInternal(limit = 20, days = 30, country = null, year = null) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let query = supabase
      .from('listings')
      .select('id, brand, model, year, version, trim, dom_days, price, sold_date, location_country')
      .eq('status', 'sold')
      .gte('sold_date', cutoffDate.toISOString())
      .not('dom_days', 'is', null)
      .gte('dom_days', 0);

    if (country) {
      query = query.eq('location_country', country.toUpperCase());
    } else {
      query = query.in('location_country', AGGREGATE_COUNTRIES);
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

    // Grouping strategy:
    // - With a year filter: group by brand+model+year (user wants a specific year)
    // - Without year filter: group by brand+model only to aggregate across years AND countries.
    //   Grouping by year would fragment data (BMW 118 2020 vs 2021 vs 2022 = 3 small groups)
    //   causing single-country bias when one country dominates a specific year.
    const groupByYear = !!year;
    const modelGroups = new Map();

    for (const listing of soldListings) {
      const key = groupByYear
        ? `${listing.brand}|${listing.model}|${listing.year || 'all'}`
        : `${listing.brand}|${listing.model}`;

      if (!modelGroups.has(key)) {
        modelGroups.set(key, {
          brand: listing.brand,
          model: listing.model,
          year: groupByYear ? listing.year : null,
          sales: [],
          domDays: [],
          prices: []
        });
      }

      const group = modelGroups.get(key);
      group.sales.push(listing);
      if (listing.dom_days != null && listing.dom_days >= 0) {
        group.domDays.push(listing.dom_days);
      }
      if (listing.price) {
        group.prices.push(Math.round(toEUR(listing.price, listing.location_country)));
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
        year: group.year === 2000 ? null : group.year, // 2000 = erroneous default, treat as unknown
        salesCount: group.sales.length,
        averageDOM,
        medianDOM,
        medianPrice,
        velocityPerMonth: (group.sales.length / days) * 30,
        countries: countries.length > 0 ? countries : null // Countries where this model was sold
      };
    });

    // Sort by velocity/month (sales per month = "fastest selling" by volume), then DOM, then sales count
    // Use explicit Number() and tie-breakers for deterministic ordering
    models.sort((a, b) => {
      const velA = Number(a.velocityPerMonth) ?? 0;
      const velB = Number(b.velocityPerMonth) ?? 0;
      const velDiff = velB - velA; // higher velocity first
      if (velDiff !== 0) return velDiff;
      const domDiff = (a.averageDOM ?? 0) - (b.averageDOM ?? 0); // lower DOM first
      if (domDiff !== 0) return domDiff;
      const salesDiff = (b.salesCount ?? 0) - (a.salesCount ?? 0); // more sales first
      if (salesDiff !== 0) return salesDiff;
      // Quaternary: alphabetical by brand+model+(year) for full determinism
      const keyA = `${(a.brand || '').toLowerCase()}|${(a.model || '').toLowerCase()}|${a.year ?? ''}`;
      const keyB = `${(b.brand || '').toLowerCase()}|${(b.model || '').toLowerCase()}|${b.year ?? ''}`;
      return keyA.localeCompare(keyB);
    });

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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let totalQuery = supabase
      .from('listings')
      .select('id, status')
      .ilike('brand', brand)
      .ilike('model', model)
      .gte('first_seen', cutoffDate.toISOString());

    let soldQuery = supabase
      .from('listings')
      .select('id')
      .eq('status', 'sold')
      .ilike('brand', brand)
      .ilike('model', model)
      .gte('sold_date', cutoffDate.toISOString());

    if (allowedCountries && allowedCountries.length > 0) {
      totalQuery = totalQuery.in('location_country', allowedCountries);
      soldQuery = soldQuery.in('location_country', allowedCountries);
    }

    const { data: totalListings, error: totalError } = await totalQuery;

    if (totalError) {
      throw new Error(`Failed to fetch total listings: ${totalError.message}`);
    }

    const { data: soldListings, error: soldError } = await soldQuery;

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
