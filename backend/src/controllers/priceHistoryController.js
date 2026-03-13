import { getPriceHistory, getPriceDrops, calculatePriceTrend } from '../services/priceTracker.js';
import { getSalesStats, getSalesAggregates } from '../services/saleDetector.js';
import { getTopSellingModels, calculateConversionRate, getMedianSalePrice, calculateSalesVelocity } from '../services/velocityCalculator.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { toEUR, AGGREGATE_COUNTRIES } from '../config/aggregateCountries.js';

/**
 * Get price history for a listing
 */
export async function getListingPriceHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const history = await getPriceHistory(id, parseInt(days));

    res.json({
      success: true,
      listingId: id,
      history,
      count: history.length
    });
  } catch (error) {
    logger.error('Error getting price history', { error: error.message, listingId: req.params.id });
    next(error);
  }
}

/**
 * Get price drops for a listing
 */
export async function getListingPriceDrops(req, res, next) {
  try {
    const { id } = req.params;
    const { min_drop = 10 } = req.query;

    const drops = await getPriceDrops(id, parseFloat(min_drop));

    res.json({
      success: true,
      listingId: id,
      drops,
      count: drops.length
    });
  } catch (error) {
    logger.error('Error getting price drops', { error: error.message, listingId: req.params.id });
    next(error);
  }
}

/**
 * Get price drops by model
 */
export async function getPriceDropsByModel(req, res, next) {
  try {
    const { brand, model, min_drop = 8, days = 30 } = req.query;

    if (!brand || !model) {
      return res.status(400).json({
        success: false,
        error: 'Brand and model are required'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Get listings for this model
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id')
      .ilike('brand', brand)
      .ilike('model', model)
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    // Get price drops for these listings
    const allDrops = [];
    for (const listing of listings || []) {
      const drops = await getPriceDrops(listing.id, parseFloat(min_drop));
      for (const drop of drops) {
        if (new Date(drop.recorded_at) >= cutoffDate) {
          allDrops.push({
            listingId: listing.id,
            ...drop
          });
        }
      }
    }

    // Sort by drop percentage (highest first)
    allDrops.sort((a, b) => (b.drop_pct || 0) - (a.drop_pct || 0));

    res.json({
      success: true,
      brand,
      model,
      drops: allDrops,
      count: allDrops.length
    });
  } catch (error) {
    logger.error('Error getting price drops by model', { error: error.message });
    next(error);
  }
}

/**
 * Get undervalued listings (hot deals)
 */
export async function getUndervaluedListings(req, res, next) {
  try {
    const { threshold = 10, dom_min = 60, limit = 20 } = req.query;

    // Get listings with DOM > dom_min and price drop
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        id,
        brand,
        model,
        year,
        price,
        mileage,
        price_drop_pct,
        price_drop_amount,
        dom_days,
        url,
        images
      `)
      .eq('status', 'active')
      .gte('dom_days', parseInt(dom_min))
      .gte('price_drop_pct', parseFloat(threshold))
      .not('price_drop_pct', 'is', null)
      .order('price_drop_pct', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      throw error;
    }

    // Calculate "deal score" based on drop % and DOM
    const deals = (listings || []).map(listing => {
      const dealScore = (listing.price_drop_pct || 0) * 0.7 + (listing.dom_days || 0) * 0.3;
      return {
        ...listing,
        dealScore: Math.round(dealScore)
      };
    });

    deals.sort((a, b) => b.dealScore - a.dealScore);

    res.json({
      success: true,
      listings: deals,
      count: deals.length
    });
  } catch (error) {
    logger.error('Error getting undervalued listings', { error: error.message });
    next(error);
  }
}

/**
 * Get fastest selling models (top models by sales velocity)
 */
export async function getFastestSellingModels(req, res, next) {
  try {
    const { limit = 20, days = 30, brand = null, country = null, year = null } = req.query;

    const requestedCountry = country ? country.toUpperCase() : null;

    let topModels = await getTopSellingModels(
      parseInt(limit),
      parseInt(days),
      requestedCountry,
      year ? parseInt(year) : null
    );

    if (brand) {
      topModels = topModels.filter(m => 
        m.brand.toLowerCase() === brand.toLowerCase()
      );
    }

    // Add ranking and additional metrics
    const modelsWithRanking = topModels.map((model, index) => ({
      rank: index + 1,
      ...model,
      // Calculate speed score (lower DOM = faster = higher score)
      speedScore: model.averageDOM > 0 ? Math.round(1000 / model.averageDOM) : 0
    }));

    res.json({
      success: true,
      models: modelsWithRanking,
      count: modelsWithRanking.length,
      period: {
        days: parseInt(days),
        description: days === 7 ? '7 derniers jours' : days === 30 ? '30 derniers jours' : `${days} derniers jours`
      }
    });
  } catch (error) {
    logger.error('Error getting fastest selling models', { error: error.message });
    next(error);
  }
}

/**
 * Get filter options for Market Insights (brands, countries, years)
 */
export async function getFilterOptions(req, res, next) {
  try {
    // Get unique brands from sold listings
    const { data: brandsData, error: brandsError } = await supabase
      .from('listings')
      .select('brand')
      .eq('status', 'sold')
      .in('location_country', AGGREGATE_COUNTRIES)
      .not('brand', 'is', null);

    const { data: countriesData, error: countriesError } = await supabase
      .from('listings')
      .select('location_country')
      .eq('status', 'sold')
      .in('location_country', AGGREGATE_COUNTRIES)
      .not('location_country', 'is', null);

    // Get unique years from sold listings
    const { data: yearsData, error: yearsError } = await supabase
      .from('listings')
      .select('year')
      .eq('status', 'sold')
      .in('location_country', AGGREGATE_COUNTRIES)
      .not('year', 'is', null)
      .gte('year', 2000) // Only years >= 2000
      .lte('year', new Date().getFullYear() + 1); // Up to next year

    if (brandsError || countriesError || yearsError) {
      throw new Error('Failed to fetch filter options');
    }

    // Extract unique values and sort (countries limited to aggregate list)
    const brands = [...new Set((brandsData || []).map(b => b.brand).filter(Boolean))].sort();
    const countriesRaw = [...new Set((countriesData || []).map(c => c.location_country).filter(Boolean))];
    const countries = countriesRaw.filter(c => AGGREGATE_COUNTRIES.includes(c)).sort();
    const years = [...new Set((yearsData || []).map(y => y.year).filter(Boolean))].sort((a, b) => b - a);

    const countryNames = {
      'FR': 'France',
      'SE': 'Suède',
      'DE': 'Allemagne',
      'BE': 'Belgique',
      'NL': 'Pays-Bas',
      'IT': 'Italie',
      'ES': 'Espagne',
      'AT': 'Autriche',
      'CH': 'Suisse',
      'LU': 'Luxembourg',
      'GB': 'Royaume-Uni',
      'DK': 'Danemark',
      'NO': 'Norvège',
      'FI': 'Finlande',
      'PL': 'Pologne',
      'PT': 'Portugal',
      'CZ': 'Tchéquie',
      'RO': 'Roumanie',
      'HU': 'Hongrie'
    };

    res.json({
      success: true,
      options: {
        brands,
        countries: countries.map(code => ({
          code,
          name: countryNames[code] || code
        })),
        years
      }
    });
  } catch (error) {
    logger.error('Error getting filter options', { error: error.message });
    next(error);
  }
}

/**
 * Get market analytics
 */
export async function getMarketAnalytics(req, res, next) {
  try {
    const { brand, model, year } = req.query;

    const topModels = await getTopSellingModels(20, 30, null, null);

    const analytics = {
      topSellingModels: topModels,
      fastestSellingModels: topModels,
      salesStats: brand && model ? await getSalesStats(brand, model, year ? parseInt(year) : null) : null,
      conversionRate: brand && model ? await calculateConversionRate(brand, model) : null,
      medianSalePrice: brand && model ? await getMedianSalePrice(brand, model, year ? parseInt(year) : null) : null
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Error getting market analytics', { error: error.message });
    next(error);
  }
}

/**
 * Get accumulated sales averages per country (DOM moyen, prix moyen)
 */
export async function getSalesAggregatesEndpoint(req, res, next) {
  try {
    const { brand, model, country } = req.query;
    const filters = {};
    if (brand) filters.brand = brand;
    if (model) filters.model = model;
    if (country) filters.country = country;
    const { rows, global } = await getSalesAggregates(filters);
    res.json({
      success: true,
      aggregates: rows,
      global  // Moyenne globale (tous pays confondus)
    });
  } catch (error) {
    logger.error('Error getting sales aggregates', { error: error.message });
    next(error);
  }
}

/**
 * Get statistics by country (for comparative charts)
 */
export async function getStatsByCountry(req, res, next) {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const { data: soldListings, error } = await supabase
      .from('listings')
      .select('id, brand, model, year, dom_days, price, sold_date, location_country')
      .eq('status', 'sold')
      .in('location_country', AGGREGATE_COUNTRIES)
      .gte('sold_date', cutoffDate.toISOString())
      .not('dom_days', 'is', null)
      .gte('dom_days', 0)
      .not('location_country', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch sold listings: ${error.message}`);
    }

    if (!soldListings || soldListings.length === 0) {
      return res.json({
        success: true,
        stats: []
      });
    }

    // Group by country
    const countryStats = new Map();

    for (const listing of soldListings) {
      const country = listing.location_country;
      
      if (!countryStats.has(country)) {
        countryStats.set(country, {
          country,
          sales: [],
          domDays: [],
          prices: [],
          models: new Set()
        });
      }

      const stats = countryStats.get(country);
      stats.sales.push(listing);
      if (listing.dom_days) {
        stats.domDays.push(listing.dom_days);
      }
      if (listing.price) {
        stats.prices.push(toEUR(listing.price, listing.location_country));
      }
      if (listing.brand && listing.model) {
        stats.models.add(`${listing.brand} ${listing.model}`);
      }
    }

    // Calculate metrics for each country
    const stats = Array.from(countryStats.values()).map(countryData => {
      const domDays = countryData.domDays.sort((a, b) => a - b);
      const prices = countryData.prices.sort((a, b) => a - b);

      const averageDOM = domDays.length > 0
        ? Math.round(domDays.reduce((sum, d) => sum + d, 0) / domDays.length)
        : 0;

      const medianDOM = domDays.length > 0
        ? domDays[Math.floor(domDays.length / 2)]
        : 0;

      const averagePrice = prices.length > 0
        ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
        : 0;

      const medianPrice = prices.length > 0
        ? Math.round(prices[Math.floor(prices.length / 2)])
        : 0;

      return {
        country: countryData.country,
        totalSales: countryData.sales.length,
        uniqueModels: countryData.models.size,
        averageDOM,
        medianDOM,
        averagePrice,
        medianPrice,
        priceRange: {
          min: prices[0] || 0,
          max: prices[prices.length - 1] || 0
        },
        velocityPerMonth: (countryData.sales.length / parseInt(days)) * 30
      };
    });

    // Sort by total sales (descending)
    stats.sort((a, b) => b.totalSales - a.totalSales);

    // Global average (tous pays)
    const totalSales = stats.reduce((s, x) => s + x.totalSales, 0);
    const global = totalSales > 0 ? {
      country: 'ALL',
      countryLabel: 'Tous pays',
      totalSales,
      uniqueModels: stats.reduce((s, x) => s + (x.uniqueModels || 0), 0),
      averageDOM: Math.round(stats.reduce((s, x) => s + x.averageDOM * x.totalSales, 0) / totalSales),
      medianDOM: Math.round(stats.reduce((s, x) => s + x.medianDOM * x.totalSales, 0) / totalSales),
      averagePrice: Math.round(stats.reduce((s, x) => s + x.averagePrice * x.totalSales, 0) / totalSales),
      medianPrice: Math.round(stats.reduce((s, x) => s + x.medianPrice * x.totalSales, 0) / totalSales),
      velocityPerMonth: Math.round(100 * stats.reduce((s, x) => s + (x.velocityPerMonth || 0) * x.totalSales, 0) / totalSales) / 100
    } : null;

    res.json({
      success: true,
      stats,
      global,
      period: {
        days: parseInt(days),
        description: days === 7 ? '7 derniers jours' : days === 30 ? '30 derniers jours' : `${days} derniers jours`
      }
    });
  } catch (error) {
    logger.error('Error getting stats by country', { error: error.message });
    next(error);
  }
}

/**
 * Export fastest selling models data as CSV
 */
export async function exportFastestSellingModels(req, res, next) {
  try {
    const { limit = 100, days = 30, brand = null, country = null, year = null, format = 'csv' } = req.query;

    const requestedCountry = country ? country.toUpperCase() : null;

    let models = await getTopSellingModels(
      parseInt(limit),
      parseInt(days),
      requestedCountry,
      year ? parseInt(year) : null
    );

    // Filter by brand if provided
    if (brand) {
      models = models.filter(m => m.brand.toLowerCase() === brand.toLowerCase());
    }

    // Add ranking
    const modelsWithRanking = models.map((model, index) => ({
      rank: index + 1,
      ...model,
      countries: model.countries ? model.countries.join(', ') : ''
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Rank', 'Brand', 'Model', 'Year', 'Version/Trim', 'Sales Count', 'Average DOM (days)', 'Median DOM (days)', 'Median Price (EUR)', 'Velocity/Month', 'Countries'];
      const rows = modelsWithRanking.map(m => [
        m.rank,
        m.brand,
        m.model,
        m.year || '',
        m.variant || '',
        m.salesCount,
        m.averageDOM,
        m.medianDOM,
        m.medianPrice,
        m.velocityPerMonth.toFixed(2),
        m.countries
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="fastest-selling-models-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csvContent); // BOM for Excel compatibility
    } else {
      // JSON format
      res.json({
        success: true,
        data: modelsWithRanking,
        period: {
          days: parseInt(days),
          description: days === 7 ? '7 derniers jours' : days === 30 ? '30 derniers jours' : `${days} derniers jours`
        },
        filters: {
          brand: brand || null,
          country: country || null,
          year: year || null
        }
      });
    }
  } catch (error) {
    logger.error('Error exporting fastest selling models', { error: error.message });
    next(error);
  }
}

/**
 * Compare multiple models side by side
 */
export async function compareModels(req, res, next) {
  try {
    const { models } = req.body; // Array of {brand, model, year?}
    const { days = 30 } = req.query;

    if (!models || !Array.isArray(models) || models.length < 2 || models.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Please provide 2-5 models to compare. Format: [{brand, model, year?}, ...]'
      });
    }

    const comparisons = await Promise.all(
      models.map(async (model) => {
        const stats = await getSalesStats(model.brand, model.model, model.year ? parseInt(model.year) : null);
        const velocity = await calculateSalesVelocity(model.brand, model.model, parseInt(days));
        const medianPrice = await getMedianSalePrice(model.brand, model.model, model.year ? parseInt(model.year) : null);
        const conversionRate = await calculateConversionRate(model.brand, model.model, parseInt(days));

        return {
          brand: model.brand,
          model: model.model,
          year: model.year || null,
          ...stats,
          ...velocity,
          ...medianPrice,
          conversionRate: conversionRate.conversionRate
        };
      })
    );

    res.json({
      success: true,
      comparisons,
      period: {
        days: parseInt(days),
        description: days === 7 ? '7 derniers jours' : days === 30 ? '30 derniers jours' : `${days} derniers jours`
      }
    });
  } catch (error) {
    logger.error('Error comparing models', { error: error.message });
    next(error);
  }
}

/**
 * Get trends over time for a model
 */
export async function getModelTrends(req, res, next) {
  try {
    const { brand, model, year = null, months = 6 } = req.query;

    if (!brand || !model) {
      return res.status(400).json({
        success: false,
        error: 'Brand and model are required'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(months));

    let query = supabase
      .from('listings')
      .select('id, price, dom_days, sold_date, location_country')
      .eq('status', 'sold')
      .ilike('brand', brand)
      .ilike('model', model)
      .gte('sold_date', cutoffDate.toISOString())
      .not('dom_days', 'is', null)
      .gte('dom_days', 0);

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    const { data: soldListings, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch trends: ${error.message}`);
    }

    if (!soldListings || soldListings.length === 0) {
      return res.json({
        success: true,
        trends: [],
        brand,
        model,
        year: year ? parseInt(year) : null
      });
    }

    // Group by month
    const monthlyData = new Map();

    for (const listing of soldListings) {
      const soldDate = new Date(listing.sold_date);
      const monthKey = `${soldDate.getFullYear()}-${String(soldDate.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          sales: [],
          domDays: [],
          prices: []
        });
      }

      const monthData = monthlyData.get(monthKey);
      monthData.sales.push(listing);
      if (listing.dom_days) {
        monthData.domDays.push(listing.dom_days);
      }
      if (listing.price) {
        monthData.prices.push(toEUR(listing.price, listing.location_country));
      }
    }

    // Calculate metrics per month
    const trends = Array.from(monthlyData.entries())
      .map(([month, data]) => {
        const domDays = data.domDays.sort((a, b) => a - b);
        const prices = data.prices.sort((a, b) => a - b);

        return {
          month,
          salesCount: data.sales.length,
          averageDOM: domDays.length > 0
            ? Math.round(domDays.reduce((sum, d) => sum + d, 0) / domDays.length)
            : 0,
          medianDOM: domDays.length > 0
            ? domDays[Math.floor(domDays.length / 2)]
            : 0,
          averagePrice: prices.length > 0
            ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
            : 0,
          medianPrice: prices.length > 0
            ? Math.round(prices[Math.floor(prices.length / 2)])
            : 0,
          priceRange: {
            min: prices[0] || 0,
            max: prices[prices.length - 1] || 0
          }
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate trend direction
    if (trends.length >= 2) {
      const recent = trends.slice(-3);
      const older = trends.slice(0, Math.max(1, trends.length - 3));
      
      const recentAvgDOM = recent.reduce((sum, t) => sum + t.averageDOM, 0) / recent.length;
      const olderAvgDOM = older.reduce((sum, t) => sum + t.averageDOM, 0) / older.length;
      const domTrend = recentAvgDOM < olderAvgDOM ? 'down' : recentAvgDOM > olderAvgDOM ? 'up' : 'stable';

      const recentAvgPrice = recent.reduce((sum, t) => sum + t.averagePrice, 0) / recent.length;
      const olderAvgPrice = older.reduce((sum, t) => sum + t.averagePrice, 0) / older.length;
      const priceTrend = recentAvgPrice < olderAvgPrice ? 'down' : recentAvgPrice > olderAvgPrice ? 'up' : 'stable';

      return res.json({
        success: true,
        trends,
        brand,
        model,
        year: year ? parseInt(year) : null,
        period: {
          months: parseInt(months),
          startMonth: trends[0]?.month,
          endMonth: trends[trends.length - 1]?.month
        },
        trendDirection: {
          dom: domTrend,
          price: priceTrend,
          domChange: Math.round(recentAvgDOM - olderAvgDOM),
          priceChange: Math.round(recentAvgPrice - olderAvgPrice),
          priceChangePct: olderAvgPrice > 0 ? Math.round(((recentAvgPrice - olderAvgPrice) / olderAvgPrice) * 100) : 0
        }
      });
    }

    res.json({
      success: true,
      trends,
      brand,
      model,
      year: year ? parseInt(year) : null,
      trendDirection: null
    });
  } catch (error) {
    logger.error('Error getting model trends', { error: error.message });
    next(error);
  }
}

/**
 * Get profitability analysis for models
 */
export async function getProfitabilityAnalysis(req, res, next) {
  try {
    const { country = null, days = 90, minSales = 5 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    let query = supabase
      .from('listings')
      .select('id, brand, model, year, price, sold_date, dom_days, location_country, first_seen')
      .eq('status', 'sold')
      .gte('sold_date', cutoffDate.toISOString())
      .not('dom_days', 'is', null)
      .gte('dom_days', 0);

    if (country) {
      query = query.eq('location_country', country.toUpperCase());
    }

    const { data: soldListings, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch sold listings: ${error.message}`);
    }

    if (!soldListings || soldListings.length === 0) {
      return res.json({
        success: true,
        profitability: []
      });
    }

    // Get price history for each listing to estimate purchase price (first price seen)
    const profitabilityData = new Map();

    for (const listing of soldListings) {
      const key = `${listing.brand}|${listing.model}|${listing.year || 'all'}`;

      // Get first price from price_history
      const { data: priceHistory, error: phError } = await supabase
        .from('price_history')
        .select('price, recorded_at')
        .eq('listing_id', listing.id)
        .order('recorded_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const purchasePrice = toEUR(priceHistory?.price || listing.price, listing.location_country);
      const salePrice = toEUR(listing.price, listing.location_country);
      const profit = salePrice - purchasePrice;
      const profitMargin = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0;
      const roi = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0;

      if (!profitabilityData.has(key)) {
        profitabilityData.set(key, {
          brand: listing.brand,
          model: listing.model,
          year: listing.year,
          sales: [],
          totalProfit: 0,
          totalRevenue: 0,
          totalCost: 0,
          domDays: []
        });
      }

      const data = profitabilityData.get(key);
      data.sales.push({
        purchasePrice,
        salePrice,
        profit,
        profitMargin,
        roi,
        domDays: listing.dom_days
      });
      data.totalProfit += profit;
      data.totalRevenue += salePrice;
      data.totalCost += purchasePrice;
      if (listing.dom_days) {
        data.domDays.push(listing.dom_days);
      }
    }

    // Calculate metrics and filter by minSales
    const profitability = Array.from(profitabilityData.values())
      .filter(data => data.sales.length >= parseInt(minSales))
      .map(data => {
        const avgDOM = data.domDays.length > 0
          ? Math.round(data.domDays.reduce((sum, d) => sum + d, 0) / data.domDays.length)
          : 0;

        const avgProfit = data.sales.length > 0
          ? Math.round(data.totalProfit / data.sales.length)
          : 0;

        const avgROI = data.sales.length > 0
          ? data.sales.reduce((sum, s) => sum + s.roi, 0) / data.sales.length
          : 0;

        const avgProfitMargin = data.sales.length > 0
          ? data.sales.reduce((sum, s) => sum + s.profitMargin, 0) / data.sales.length
          : 0;

        return {
          brand: data.brand,
          model: data.model,
          year: data.year,
          salesCount: data.sales.length,
          totalProfit: Math.round(data.totalProfit),
          totalRevenue: Math.round(data.totalRevenue),
          totalCost: Math.round(data.totalCost),
          averageProfit: avgProfit,
          averageROI: Math.round(avgROI * 10) / 10,
          averageProfitMargin: Math.round(avgProfitMargin * 10) / 10,
          averageDOM: avgDOM,
          profitPerDay: avgDOM > 0 ? Math.round(avgProfit / avgDOM) : 0
        };
      })
      .sort((a, b) => b.averageROI - a.averageROI); // Sort by ROI descending

    res.json({
      success: true,
      profitability,
      period: {
        days: parseInt(days),
        description: days === 30 ? '30 derniers jours' : days === 90 ? '90 derniers jours' : `${days} derniers jours`
      },
      filters: {
        country: country || null,
        minSales: parseInt(minSales)
      }
    });
  } catch (error) {
    logger.error('Error getting profitability analysis', { error: error.message });
    next(error);
  }
}

/**
 * Create alert for fast-selling models
 */
export async function createFastModelAlert(req, res, next) {
  try {
    const { brand, model, year = null, alertType, threshold } = req.body;
    const userId = req.user.id;

    if (!brand || !model || !alertType) {
      return res.status(400).json({
        success: false,
        error: 'brand, model, and alertType are required'
      });
    }

    // Validate alertType
    const validTypes = ['top10', 'velocity', 'dom_drop'];
    if (!validTypes.includes(alertType)) {
      return res.status(400).json({
        success: false,
        error: `alertType must be one of: ${validTypes.join(', ')}`
      });
    }

    // Create alert criteria
    const criteria = {
      brand,
      model,
      year: year ? parseInt(year) : null,
      alertType
    };

    const thresholdData = threshold || {};

    // Create alert using existing alert service
    const { createAlertService } = await import('../services/alertsService.js');
    const alert = await createAlertService({
      userId,
      name: `Alerte ${alertType} - ${brand} ${model}${year ? ` ${year}` : ''}`,
      type: 'fast_model',
      criteria,
      threshold: thresholdData,
      webhook_url: null
    });

    res.json({
      success: true,
      alert: {
        id: alert.alert_id,
        name: `Alerte ${alertType} - ${brand} ${model}${year ? ` ${year}` : ''}`,
        type: 'fast_model',
        criteria,
        threshold: thresholdData
      }
    });
  } catch (error) {
    logger.error('Error creating fast model alert', { error: error.message });
    next(error);
  }
}

/**
 * Get intelligent recommendations
 */
export async function getRecommendations(req, res, next) {
  try {
    const { limit = 10, type = 'all' } = req.query;

    const recommendations = [];

    // 1. Underrated models with high potential (low DOM + price drop)
    if (type === 'all' || type === 'underrated') {
      const { data: underrated, error: underratedError } = await supabase
        .from('listings')
        .select('brand, model, year, price, price_drop_pct, dom_days, location_country')
        .eq('status', 'active')
        .gte('dom_days', 60)
        .gte('price_drop_pct', 10)
        .not('price_drop_pct', 'is', null)
        .order('price_drop_pct', { ascending: false })
        .limit(20);

      if (!underratedError && underrated) {
        // Group by model and calculate potential score
        const modelGroups = new Map();
        for (const listing of underrated) {
          const key = `${listing.brand}|${listing.model}|${listing.year || 'all'}`;
          if (!modelGroups.has(key)) {
            modelGroups.set(key, {
              brand: listing.brand,
              model: listing.model,
              year: listing.year,
              listings: [],
              avgPriceDrop: 0,
              avgDOM: 0,
              potentialScore: 0
            });
          }
          modelGroups.get(key).listings.push(listing);
        }

        const underratedModels = Array.from(modelGroups.values()).map(group => {
          const avgPriceDrop = group.listings.reduce((sum, l) => sum + (l.price_drop_pct || 0), 0) / group.listings.length;
          const avgDOM = group.listings.reduce((sum, l) => sum + (l.dom_days || 0), 0) / group.listings.length;
          const potentialScore = (avgPriceDrop * 0.6) + ((avgDOM / 100) * 0.4) * 100; // Higher = better opportunity

          return {
            ...group,
            avgPriceDrop: Math.round(avgPriceDrop * 10) / 10,
            avgDOM: Math.round(avgDOM),
            potentialScore: Math.round(potentialScore),
            listingsCount: group.listings.length,
            reason: 'Sous-évalué avec fort potentiel'
          };
        }).sort((a, b) => b.potentialScore - a.potentialScore).slice(0, 5);

        recommendations.push(...underratedModels.map(m => ({
          type: 'underrated',
          ...m
        })));
      }
    }

    // 2. Fast-selling models entering top ranks
    if (type === 'all' || type === 'fast_rising') {
      const topModels = await getTopSellingModels(20, 7); // Last 7 days
      const previousTopModels = await getTopSellingModels(20, 14); // Last 14 days

      const previousRanks = new Map();
      previousTopModels.forEach((m, idx) => {
        const key = `${m.brand}|${m.model}|${m.year || 'all'}`;
        previousRanks.set(key, idx + 1);
      });

      const fastRising = topModels
        .filter((m, idx) => {
          const key = `${m.brand}|${m.model}|${m.year || 'all'}`;
          const prevRank = previousRanks.get(key);
          return !prevRank || prevRank > idx + 1; // Improved rank
        })
        .slice(0, 5)
        .map(m => ({
          type: 'fast_rising',
          brand: m.brand,
          model: m.model,
          year: m.year,
          currentRank: topModels.indexOf(m) + 1,
          previousRank: previousRanks.get(`${m.brand}|${m.model}|${m.year || 'all'}`) || null,
          averageDOM: m.averageDOM,
          salesCount: m.salesCount,
          reason: 'Modèle en forte progression'
        }));

      recommendations.push(...fastRising);
    }

    // 3. Opportunities (price drop + high DOM)
    if (type === 'all' || type === 'opportunity') {
      const { data: opportunities, error: oppError } = await supabase
        .from('listings')
        .select('brand, model, year, price, price_drop_pct, price_drop_amount, dom_days, last_price_drop_date, location_country')
        .eq('status', 'active')
        .gte('dom_days', 45)
        .gte('price_drop_pct', 15)
        .not('price_drop_pct', 'is', null)
        .gte('last_price_drop_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('price_drop_pct', { ascending: false })
        .limit(10);

      if (!oppError && opportunities) {
        const oppGroups = new Map();
        for (const listing of opportunities) {
          const key = `${listing.brand}|${listing.model}|${listing.year || 'all'}`;
          if (!oppGroups.has(key)) {
            oppGroups.set(key, {
              brand: listing.brand,
              model: listing.model,
              year: listing.year,
              listings: [],
              maxPriceDrop: 0,
              avgDOM: 0
            });
          }
          oppGroups.get(key).listings.push(listing);
          if (listing.price_drop_pct > oppGroups.get(key).maxPriceDrop) {
            oppGroups.get(key).maxPriceDrop = listing.price_drop_pct;
          }
        }

        const oppModels = Array.from(oppGroups.values())
          .map(group => ({
            type: 'opportunity',
            brand: group.brand,
            model: group.model,
            year: group.year,
            maxPriceDrop: Math.round(group.maxPriceDrop * 10) / 10,
            avgDOM: Math.round(group.listings.reduce((sum, l) => sum + (l.dom_days || 0), 0) / group.listings.length),
            listingsCount: group.listings.length,
            reason: 'Baisse de prix récente + DOM élevé'
          }))
          .sort((a, b) => b.maxPriceDrop - a.maxPriceDrop)
          .slice(0, 5);

        recommendations.push(...oppModels);
      }
    }

    // Sort by relevance and limit
    recommendations.sort((a, b) => {
      if (a.potentialScore && b.potentialScore) return b.potentialScore - a.potentialScore;
      if (a.maxPriceDrop && b.maxPriceDrop) return b.maxPriceDrop - a.maxPriceDrop;
      return 0;
    });

    res.json({
      success: true,
      recommendations: recommendations.slice(0, parseInt(limit)),
      count: recommendations.length
    });
  } catch (error) {
    logger.error('Error getting recommendations', { error: error.message });
    next(error);
  }
}

/**
 * Get competition analysis
 */
export async function getCompetitionAnalysis(req, res, next) {
  try {
    const { brand, model, year = null, country = null } = req.query;

    if (!brand || !model) {
      return res.status(400).json({
        success: false,
        error: 'Brand and model are required'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Last 90 days

    let activeQuery = supabase
      .from('listings')
      .select('id, price, dom_days, location_country, posted_date')
      .eq('status', 'active')
      .ilike('brand', brand)
      .ilike('model', model);

    if (year) {
      activeQuery = activeQuery.eq('year', parseInt(year));
    }
    if (country) {
      activeQuery = activeQuery.eq('location_country', country.toUpperCase());
    }

    const { data: activeListings, error: activeError } = await activeQuery;

    let soldQuery = supabase
      .from('listings')
      .select('id, price, dom_days, sold_date, location_country')
      .eq('status', 'sold')
      .ilike('brand', brand)
      .ilike('model', model)
      .gte('sold_date', cutoffDate.toISOString());

    if (year) {
      soldQuery = soldQuery.eq('year', parseInt(year));
    }
    if (country) {
      soldQuery = soldQuery.eq('location_country', country.toUpperCase());
    }

    const { data: soldListings, error: soldError } = await soldQuery;

    if (activeError || soldError) {
      throw new Error('Failed to fetch competition data');
    }

    const activeCount = activeListings?.length || 0;
    const soldCount = soldListings?.length || 0;
    const totalListings = activeCount + soldCount;

    // Calculate market saturation
    const saturationRate = totalListings > 0 ? (activeCount / totalListings) * 100 : 0;

    // Calculate average DOM for active listings
    const activeDOMs = (activeListings || []).map(l => l.dom_days || 0).filter(d => d > 0);
    const avgActiveDOM = activeDOMs.length > 0
      ? Math.round(activeDOMs.reduce((sum, d) => sum + d, 0) / activeDOMs.length)
      : 0;

    // Calculate average DOM for sold listings
    const soldDOMs = (soldListings || []).map(l => l.dom_days || 0).filter(d => d > 0);
    const avgSoldDOM = soldDOMs.length > 0
      ? Math.round(soldDOMs.reduce((sum, d) => sum + d, 0) / soldDOMs.length)
      : 0;

    const prices = (activeListings || []).map(l => toEUR(l.price, l.location_country)).filter(p => p > 0).sort((a, b) => a - b);
    const priceRange = {
      min: prices[0] || 0,
      max: prices[prices.length - 1] || 0,
      median: prices.length > 0 ? Math.round(prices[Math.floor(prices.length / 2)]) : 0,
      average: prices.length > 0 ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length) : 0
    };

    // Determine scarcity level
    let scarcityLevel = 'normal';
    let scarcityMessage = 'Offre normale';
    if (activeCount < 5 && soldCount > 10) {
      scarcityLevel = 'high_demand';
      scarcityMessage = 'Forte demande, faible offre (pénurie)';
    } else if (activeCount > 50 && soldCount < 10) {
      scarcityLevel = 'oversupply';
      scarcityMessage = 'Surplus d\'offre, faible demande';
    } else if (activeCount < 10) {
      scarcityLevel = 'low_supply';
      scarcityMessage = 'Offre limitée';
    }

    res.json({
      success: true,
      brand,
      model,
      year: year ? parseInt(year) : null,
      country: country || null,
      competition: {
        activeListings: activeCount,
        soldListings: soldCount,
        totalListings,
        saturationRate: Math.round(saturationRate * 10) / 10,
        scarcityLevel,
        scarcityMessage,
        averageActiveDOM: avgActiveDOM,
        averageSoldDOM: avgSoldDOM,
        priceRange,
        conversionRate: totalListings > 0 ? Math.round((soldCount / totalListings) * 100 * 10) / 10 : 0
      }
    });
  } catch (error) {
    logger.error('Error getting competition analysis', { error: error.message });
    next(error);
  }
}

/**
 * Add model to watchlist
 */
export async function addToWatchlist(req, res, next) {
  try {
    const { brand, model, year = null, notes = null } = req.body;
    const userId = req.user.id;

    if (!brand || !model) {
      return res.status(400).json({
        success: false,
        error: 'Brand and model are required'
      });
    }

    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: userId,
        brand,
        model,
        year: year ? parseInt(year) : null,
        notes: notes || null,
        notification_enabled: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: 'Ce modèle est déjà dans votre watchlist'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      watchlistItem: data
    });
  } catch (error) {
    logger.error('Error adding to watchlist', { error: error.message });
    next(error);
  }
}

/**
 * Get user watchlist
 */
export async function getWatchlist(req, res, next) {
  try {
    const userId = req.user.id;

    const { data: watchlist, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Enrich with current stats
    const enrichedWatchlist = await Promise.all(
      (watchlist || []).map(async (item) => {
        try {
          const stats = await getSalesStats(item.brand, item.model, item.year);
          const velocity = await calculateSalesVelocity(item.brand, item.model, 30);
          const medianPrice = await getMedianSalePrice(item.brand, item.model, item.year);

          // Get current rank in fastest selling
          const topModels = await getTopSellingModels(100, 30);
          const rank = topModels.findIndex(m => 
            m.brand.toLowerCase() === item.brand.toLowerCase() &&
            m.model.toLowerCase() === item.model.toLowerCase() &&
            (item.year ? m.year === item.year : true)
          ) + 1; // +1 because index is 0-based

          return {
            ...item,
            currentStats: {
              averageDOM: stats.averageDOM,
              totalSales: stats.totalSales,
              velocityPerMonth: velocity.velocityPerMonth,
              medianPrice: medianPrice.medianPrice,
              currentRank: rank > 0 ? rank : null
            }
          };
        } catch (err) {
          logger.warn('Error enriching watchlist item', { error: err.message, item });
          return {
            ...item,
            currentStats: null
          };
        }
      })
    );

    res.json({
      success: true,
      watchlist: enrichedWatchlist,
      count: enrichedWatchlist.length
    });
  } catch (error) {
    logger.error('Error getting watchlist', { error: error.message });
    next(error);
  }
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Modèle retiré de la watchlist'
    });
  } catch (error) {
    logger.error('Error removing from watchlist', { error: error.message });
    next(error);
  }
}

/**
 * Get watchlist history
 */
export async function getWatchlistHistory(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify watchlist item belongs to user
    const { data: watchlistItem, error: checkError } = await supabase
      .from('watchlist')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !watchlistItem) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist item not found'
      });
    }

    const { data: history, error } = await supabase
      .from('watchlist_history')
      .select('*')
      .eq('watchlist_id', id)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      history: history || [],
      count: history?.length || 0
    });
  } catch (error) {
    logger.error('Error getting watchlist history', { error: error.message });
    next(error);
  }
}

/**
 * Simple ML-based predictions (heuristic-based for now)
 */
export async function getPredictions(req, res, next) {
  try {
    const { brand, model, year = null, currentPrice, currentDOM = 0 } = req.query;

    if (!brand || !model || !currentPrice) {
      return res.status(400).json({
        success: false,
        error: 'brand, model, and currentPrice are required'
      });
    }

    // Get historical data for predictions
    const stats = await getSalesStats(brand, model, year ? parseInt(year) : null);
    
    // Get trends data directly
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    
    let trendsQuery = supabase
      .from('listings')
      .select('id, price, dom_days, sold_date')
      .eq('status', 'sold')
      .ilike('brand', brand)
      .ilike('model', model)
      .gte('sold_date', cutoffDate.toISOString())
      .not('dom_days', 'is', null)
      .gte('dom_days', 0);

    if (year) {
      trendsQuery = trendsQuery.eq('year', parseInt(year));
    }

    const { data: soldListings } = await trendsQuery;
    
    let trendDirection = null;
    if (soldListings && soldListings.length > 0) {
      const prices = soldListings.map(l => toEUR(l.price, l.location_country)).filter(p => p > 0);
      const recentPrices = prices.slice(-Math.floor(prices.length / 3));
      const olderPrices = prices.slice(0, Math.floor(prices.length * 2 / 3));
      
      if (recentPrices.length > 0 && olderPrices.length > 0) {
        const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
        const priceChange = recentAvg - olderAvg;
        const priceChangePct = olderAvg > 0 ? (priceChange / olderAvg) * 100 : 0;
        
        trendDirection = {
          price: priceChange < -100 ? 'down' : priceChange > 100 ? 'up' : 'stable',
          priceChange: Math.round(priceChange),
          priceChangePct: Math.round(priceChangePct * 10) / 10
        };
      }
    }

    // Simple heuristic predictions
    const avgDOM = stats.averageDOM || 30;
    const medianPrice = stats.medianPrice || parseFloat(currentPrice);
    const priceDiff = parseFloat(currentPrice) - medianPrice;
    const priceDiffPct = medianPrice > 0 ? (priceDiff / medianPrice) * 100 : 0;

    // Predict sale time (based on current DOM vs average)
    const predictedSaleTime = Math.max(0, avgDOM - (currentDOM || 0));
    const saleTimeConfidence = currentDOM > 0 ? Math.min(100, Math.max(0, 100 - (Math.abs(currentDOM - avgDOM) / avgDOM) * 100)) : 50;

    // Predict future price (based on trends)
    let predictedPrice = parseFloat(currentPrice);
    let priceTrend = 'stable';
    if (trendDirection) {
      const priceChange = trendDirection.priceChange || 0;
      predictedPrice = parseFloat(currentPrice) + (priceChange * 0.3); // Conservative 30% of trend
      priceTrend = trendDirection.price;
    }

    // Calculate "good deal" score (0-100)
    let dealScore = 50; // Base score
    if (priceDiffPct < -10) dealScore += 20; // Below market
    if (priceDiffPct < -20) dealScore += 15; // Well below market
    if (currentDOM > avgDOM * 1.5) dealScore += 15; // High DOM = seller motivated
    if (priceDiffPct > 10) dealScore -= 20; // Above market
    if (currentDOM < avgDOM * 0.5) dealScore -= 10; // Low DOM = seller not motivated
    dealScore = Math.max(0, Math.min(100, dealScore));

    res.json({
      success: true,
      brand,
      model,
      year: year ? parseInt(year) : null,
      predictions: {
        saleTime: {
          days: Math.round(predictedSaleTime),
          confidence: Math.round(saleTimeConfidence),
          message: predictedSaleTime <= 7 ? 'Vente très proche' :
                   predictedSaleTime <= 14 ? 'Vente dans les 2 semaines' :
                   predictedSaleTime <= 30 ? 'Vente dans le mois' :
                   'Vente dans plusieurs semaines'
        },
        price: {
          current: parseFloat(currentPrice),
          predicted: Math.round(predictedPrice),
          trend: priceTrend,
          marketPrice: medianPrice,
          priceDifference: Math.round(priceDiff),
          priceDifferencePct: Math.round(priceDiffPct * 10) / 10
        },
        dealScore: {
          score: Math.round(dealScore),
          level: dealScore >= 80 ? 'excellent' :
                 dealScore >= 65 ? 'good' :
                 dealScore >= 50 ? 'fair' :
                 'poor',
          message: dealScore >= 80 ? 'Excellente affaire !' :
                   dealScore >= 65 ? 'Bonne affaire' :
                   dealScore >= 50 ? 'Prix correct' :
                   'Prix élevé'
        }
      }
    });
  } catch (error) {
    logger.error('Error getting predictions', { error: error.message });
    next(error);
  }
}

/**
 * Export data as PDF (simple JSON export for now, PDF would require puppeteer/jsPDF)
 */
export async function exportAsPDF(req, res, next) {
  try {
    const { type = 'fastest-selling', ...filters } = req.query;

    // For now, return JSON with instructions for PDF generation
    // In production, you'd use puppeteer or jsPDF to generate actual PDF
    let data = {};

    if (type === 'fastest-selling') {
      const models = await getTopSellingModels(
        parseInt(filters.limit || 50),
        parseInt(filters.days || 30),
        filters.country || null,
        filters.year ? parseInt(filters.year) : null
      );
      data = { type: 'fastest-selling', models, filters };
    } else if (type === 'profitability') {
      // Get profitability data - need to call the service directly
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(filters.days || 90));
      
      let query = supabase
        .from('listings')
        .select('id, brand, model, year, price, sold_date, dom_days, location_country')
        .eq('status', 'sold')
        .gte('sold_date', cutoffDate.toISOString())
        .not('dom_days', 'is', null)
        .gt('dom_days', 0);

      if (filters.country) {
        query = query.eq('location_country', filters.country.toUpperCase());
      }

      const { data: soldListings } = await query;
      data = { type: 'profitability', listings: soldListings?.length || 0, filters };
    }

    // Return JSON with PDF-ready structure
    // Frontend can use jsPDF or similar to generate PDF
    res.json({
      success: true,
      data,
      format: 'json',
      instructions: 'Use a PDF library (jsPDF, puppeteer) on the frontend to generate PDF from this data'
    });
  } catch (error) {
    logger.error('Error exporting as PDF', { error: error.message });
    next(error);
  }
}

/**
 * Get recent sales monitoring (last 30 days)
 * Shows what sold fastest and at what price (last price before disappearance)
 */
export async function getRecentSalesMonitoring(req, res, next) {
  try {
    const { days = 30, limit = 50, country = null, brand = null, minDOM = null, maxDOM = null } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Build query for sold listings from last 30 days
    let query = supabase
      .from('listings')
      .select(`
        id,
        brand,
        model,
        year,
        price,
        sold_date,
        dom_days,
        location_country,
        location_city,
        source_platform,
        url,
        first_seen
      `)
      .eq('status', 'sold')
      .gte('sold_date', cutoffDate.toISOString())
      .not('dom_days', 'is', null)
      .gte('dom_days', 0)
      .not('price', 'is', null)
      .gt('price', 0);

    if (country) {
      query = query.eq('location_country', country.toUpperCase());
    }
    if (brand) {
      query = query.ilike('brand', brand);
    }
    if (minDOM) {
      query = query.gte('dom_days', parseInt(minDOM));
    }
    if (maxDOM) {
      query = query.lte('dom_days', parseInt(maxDOM));
    }

    // Order by DOM (fastest first) then by sold_date (most recent first)
    query = query.order('dom_days', { ascending: true })
                 .order('sold_date', { ascending: false })
                 .limit(parseInt(limit));

    const { data: sales, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch recent sales: ${error.message}`);
    }

    // Enrich with price history (last price before sale)
    const enrichedSales = await Promise.all(
      (sales || []).map(async (sale) => {
        try {
          const { data: lastPriceRecord } = await supabase
            .from('price_history')
            .select('price, recorded_at')
            .eq('listing_id', sale.id)
            .lte('recorded_at', sale.sold_date)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastPriceBeforeSale = toEUR(lastPriceRecord ? lastPriceRecord.price : sale.price, sale.location_country);
          const finalPrice = toEUR(sale.price, sale.location_country);

          const priceChange = finalPrice !== lastPriceBeforeSale ? finalPrice - lastPriceBeforeSale : 0;
          const priceChangePct = lastPriceBeforeSale > 0 ? ((priceChange / lastPriceBeforeSale) * 100) : 0;

          return {
            ...sale,
            lastPriceBeforeSale: Math.round(lastPriceBeforeSale),
            finalPrice: Math.round(finalPrice),
            priceChange: Math.round(priceChange),
            priceChangePct: Math.round(priceChangePct * 10) / 10,
            velocity: sale.dom_days > 0 ? (30 / sale.dom_days) : 0, // Sales per month
            soldDateFormatted: new Date(sale.sold_date).toLocaleDateString('fr-FR')
          };
        } catch (err) {
          logger.warn('Error enriching sale data', { saleId: sale.id, error: err.message });
          const fallbackPrice = toEUR(sale.price, sale.location_country);
          return {
            ...sale,
            lastPriceBeforeSale: Math.round(fallbackPrice),
            finalPrice: Math.round(fallbackPrice),
            priceChange: 0,
            priceChangePct: 0,
            velocity: sale.dom_days > 0 ? (30 / sale.dom_days) : 0,
            soldDateFormatted: new Date(sale.sold_date).toLocaleDateString('fr-FR')
          };
        }
      })
    );

    // Group by model for statistics
    const modelStats = new Map();
    enrichedSales.forEach(sale => {
      const key = `${sale.brand}|${sale.model}|${sale.year || 'all'}`;
      if (!modelStats.has(key)) {
        modelStats.set(key, {
          brand: sale.brand,
          model: sale.model,
          year: sale.year,
          sales: [],
          totalSales: 0,
          avgDOM: 0,
          avgPrice: 0,
          fastestSale: null
        });
      }
      const stats = modelStats.get(key);
      stats.sales.push(sale);
      stats.totalSales++;
      if (!stats.fastestSale || sale.dom_days < stats.fastestSale.dom_days) {
        stats.fastestSale = sale;
      }
    });

    // Calculate averages for each model
    const modelStatsArray = Array.from(modelStats.values()).map(stats => {
      const doms = stats.sales.map(s => s.dom_days).filter(d => d > 0);
      const prices = stats.sales.map(s => s.lastPriceBeforeSale).filter(p => p > 0);
      
      return {
        ...stats,
        avgDOM: doms.length > 0 ? Math.round(doms.reduce((sum, d) => sum + d, 0) / doms.length) : 0,
        avgPrice: prices.length > 0 ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length) : 0,
        medianPrice: prices.length > 0 ? Math.round(prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]) : 0
      };
    });

    res.json({
      success: true,
      period: {
        days: parseInt(days),
        startDate: cutoffDate.toISOString(),
        endDate: new Date().toISOString()
      },
      filters: {
        country: country || null,
        brand: brand || null,
        minDOM: minDOM ? parseInt(minDOM) : null,
        maxDOM: maxDOM ? parseInt(maxDOM) : null
      },
      sales: enrichedSales,
      modelStats: modelStatsArray.sort((a, b) => a.avgDOM - b.avgDOM), // Sort by fastest average DOM
      summary: {
        totalSales: enrichedSales.length,
        avgDOM: enrichedSales.length > 0 
          ? Math.round(enrichedSales.reduce((sum, s) => sum + s.dom_days, 0) / enrichedSales.length)
          : 0,
        fastestSale: enrichedSales.length > 0 
          ? enrichedSales.reduce((fastest, sale) => sale.dom_days < fastest.dom_days ? sale : fastest, enrichedSales[0])
          : null,
        avgPrice: enrichedSales.length > 0
          ? Math.round(enrichedSales.reduce((sum, s) => sum + s.lastPriceBeforeSale, 0) / enrichedSales.length)
          : 0
      }
    });
  } catch (error) {
    logger.error('Error getting recent sales monitoring', { error: error.message });
    next(error);
  }
}

/**
 * Get global stats for Market Insights dashboard
 * Returns: new active listings this week, sold listings this week, average price of active listings
 */
export async function getGlobalStats(req, res, next) {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [newListingsResult, soldCountResult, priceDataResult] = await Promise.all([
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('posted_date', weekAgo.toISOString()),
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sold')
        .gte('sold_date', weekAgo.toISOString()),
      supabase
        .from('listings')
        .select('price_eur')
        .eq('status', 'active')
        .gt('price_eur', 0)
        .limit(10000)
    ]);

    const newListings = newListingsResult.count ?? 0;
    const soldCount = soldCountResult.count ?? 0;
    const priceData = priceDataResult.data ?? [];
    const avgPrice = priceData.length
      ? Math.round(priceData.reduce((sum, r) => sum + r.price_eur, 0) / priceData.length)
      : null;

    res.json({ newListings, soldCount, avgPrice });
  } catch (error) {
    logger.error('Error getting global stats', { error: error.message });
    next(error);
  }
}

/**
 * Get top price drops for Market Insights
 * Query param: period = 'day' | 'week' | 'month'
 */
export async function getPriceDropsAggregated(req, res, next) {
  try {
    const { period = 'week' } = req.query;
    const days = period === 'day' ? 1 : period === 'month' ? 30 : 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data, error } = await supabase
      .from('listings')
      .select('id, brand, model, year, price_eur, price_drop_pct, price_drop_amount, location_country, first_image_url, external_url')
      .eq('status', 'active')
      .gt('price_drop_pct', 0)
      .gte('last_price_drop_date', cutoff.toISOString())
      .order('price_drop_pct', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('Error getting price drops aggregated', { error: error.message });
      return res.status(500).json({ error: error.message });
    }

    res.json(data ?? []);
  } catch (error) {
    logger.error('Error getting price drops aggregated', { error: error.message });
    next(error);
  }
}
