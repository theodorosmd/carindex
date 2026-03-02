import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { toEUR, AGGREGATE_COUNTRIES } from '../config/aggregateCountries.js';

/** Normalize string for aggregate key (lowercase, trim, empty = '') */
function norm(s) {
  return String(s ?? '').trim().toLowerCase().slice(0, 255) || '';
}

/** Build engine key: version (motorisation) or displacement_power */
function buildEngineKey(version, displacement, powerHp) {
  const v = norm(version);
  if (v) return v;
  const d = displacement != null ? String(displacement).replace('.', '') : '0';
  const p = powerHp != null ? String(powerHp) : '0';
  return `${d}_${p}`;
}

/**
 * Update sales_aggregates with a new sale (per brand, model, fuel, trim, engine, country)
 */
async function updateSalesAggregate(listing, domDays, priceEur) {
  const country = String(listing.location_country || '').toUpperCase().slice(0, 2);
  if (!country || !AGGREGATE_COUNTRIES.includes(country)) return;

  const brand = norm(listing.brand);
  const model = norm(listing.model);
  const fuelType = norm(listing.fuel_type);
  const trimVal = norm(listing.trim);
  const engine = buildEngineKey(listing.version, listing.displacement, listing.power_hp);

  try {
    const { data: existing } = await supabase
      .from('sales_aggregates')
      .select('total_sales, sum_dom_days, sum_price_eur')
      .eq('brand', brand)
      .eq('model', model)
      .eq('fuel_type', fuelType)
      .eq('trim', trimVal)
      .eq('engine', engine)
      .eq('location_country', country)
      .maybeSingle();

    const prev = existing || { total_sales: 0, sum_dom_days: 0, sum_price_eur: 0 };
    const newTotal = (prev.total_sales || 0) + 1;
    const newSumDom = (Number(prev.sum_dom_days) || 0) + domDays;
    const newSumPrice = (Number(prev.sum_price_eur) || 0) + priceEur;

    const { error } = await supabase
      .from('sales_aggregates')
      .upsert(
        {
          brand,
          model,
          fuel_type: fuelType,
          trim: trimVal,
          engine,
          location_country: country,
          total_sales: newTotal,
          sum_dom_days: newSumDom,
          sum_price_eur: newSumPrice,
          last_updated: new Date().toISOString()
        },
        { onConflict: 'brand,model,fuel_type,trim,engine,location_country' }
      );

    if (error) {
      logger.warn('Failed to update sales_aggregates', { brand, model, country, error: error.message });
    }
  } catch (err) {
    logger.warn('Error updating sales aggregate', { brand: listing.brand, error: err.message });
  }
}

/**
 * Mark a listing as sold
 */
export async function markAsSold(listingId, soldDate = null) {
  try {
    // Get listing to calculate DOM and get last price (brand, model, fuel, trim, engine for aggregates)
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('id, first_seen, sold_date, status, price, created_at, location_country, brand, model, fuel_type, trim, version, displacement, power_hp')
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
    let domDays = Math.floor((soldDateObj - firstSeen) / (1000 * 60 * 60 * 24));
    if (domDays < 0) domDays = 0; // Clamp: first_seen > sold_date can happen with timezone skew

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

    // Update accumulating average (same brand, model, fuel, trim, engine, country)
    const country = listing.location_country || updated?.location_country;
    const priceEur = toEUR(lastPrice, country);
    await updateSalesAggregate(listing, domDays, priceEur);

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
 * Get accumulated sales aggregates (per brand, model, fuel, trim, engine, country)
 * Only returns aggregates for AGGREGATE_COUNTRIES.
 * Includes a global average across all countries.
 * Optional filters: brand, model, country
 */
export async function getSalesAggregates(filters = {}) {
  try {
    let query = supabase
      .from('sales_aggregates')
      .select('brand, model, fuel_type, trim, engine, location_country, total_sales, sum_dom_days, sum_price_eur')
      .in('location_country', AGGREGATE_COUNTRIES);

    if (filters.brand) query = query.ilike('brand', filters.brand);
    if (filters.model) query = query.ilike('model', filters.model);
    if (filters.country) query = query.eq('location_country', (filters.country || '').toUpperCase());

    const { data, error } = await query.order('total_sales', { ascending: false });

    if (error) throw new Error(`Failed to fetch sales aggregates: ${error.message}`);

    const rows = (data || []).map(row => ({
      brand: row.brand,
      model: row.model,
      fuelType: row.fuel_type,
      trim: row.trim,
      engine: row.engine,
      country: row.location_country,
      totalSales: row.total_sales || 0,
      avgDOM: row.total_sales > 0 ? Math.round((row.sum_dom_days || 0) / row.total_sales) : 0,
      avgPriceEur: row.total_sales > 0 ? Math.round((row.sum_price_eur || 0) / row.total_sales) : 0
    }));

    // Global average across all countries (when no country filter)
    let global = null;
    if (!filters.country && rows.length > 0) {
      const totSales = rows.reduce((s, r) => s + r.totalSales, 0);
      const totDom = rows.reduce((s, r) => s + r.avgDOM * r.totalSales, 0);
      const totPrice = rows.reduce((s, r) => s + r.avgPriceEur * r.totalSales, 0);
      global = {
        country: 'ALL',
        countryLabel: 'Tous pays',
        totalSales: totSales,
        avgDOM: totSales > 0 ? Math.round(totDom / totSales) : 0,
        avgPriceEur: totSales > 0 ? Math.round(totPrice / totSales) : 0
      };
    }

    return { rows, global };
  } catch (err) {
    logger.error('Error getting sales aggregates', { error: err.message });
    return { rows: [], global: null };
  }
}

/**
 * Get sales statistics for a model
 */
export async function getSalesStats(brand, model, year = null, allowedCountries = null) {
  try {
    let query = supabase
      .from('listings')
      .select('id, price, sold_date, dom_days, first_seen, location_country')
      .eq('status', 'sold')
      .ilike('brand', brand)
      .ilike('model', model);

    if (allowedCountries && allowedCountries.length > 0) {
      query = query.in('location_country', allowedCountries);
    }

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
