import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

/**
 * Create a new alert
 */
export async function createAlertService({ userId, name, type, criteria, threshold, webhook_url }) {
  const alertId = uuidv4();

  // Store alert in database using Supabase
  const { data, error } = await supabase
    .from('alerts')
    .insert({
      id: alertId,
      user_id: userId,
      name,
      type,
      criteria: criteria || {},
      threshold: threshold || {},
      webhook_url: webhook_url || null,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating alert', { error: error.message, userId, name });
    throw error;
  }

  return {
    alert_id: alertId,
    status: 'active',
    created_at: data.created_at
  };
}

/**
 * Get alert events for a user
 */
export async function getAlertEventsService({ alertId, userId, limit = 50, offset = 0, since = null }) {
  let query = supabase
    .from('alert_events')
    .select('*')
    .eq('alert_id', alertId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (since) {
    query = query.gt('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error getting alert events', { error: error.message, alertId, userId });
    throw error;
  }

  return {
    events: data || [],
    limit,
    offset
  };
}

/**
 * Get all active alerts (for cron job)
 */
export async function getActiveAlerts() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*, users!inner(email)')
    .eq('status', 'active');

  if (error) {
    logger.error('Error getting active alerts', { error: error.message });
    throw error;
  }

  return data || [];
}

/**
 * Check for arbitrage alerts (listings in buy_country profitable when sold in sell_country)
 */
async function checkArbitrageAlert(alert) {
  const criteria = alert.criteria || {};
  const brand = criteria.brand;
  const model = criteria.model;
  const buyCountry = criteria.buy_country || criteria.location_country;
  const sellCountry = criteria.sell_country;
  const minMargin = criteria.min_margin_eur || 2000;

  if (!brand || !model || !buyCountry || !sellCountry) return [];

  const { findListingsArbitrageOpportunities } = await import('./arbitrageService.js');
  const { data: events } = await supabase
    .from('alert_events')
    .select('data')
    .eq('alert_id', alert.id);

  const seenIds = new Set((events || [])
    .map(e => (typeof e.data === 'string' ? JSON.parse(e.data) : e.data)?.listingId || (typeof e.data === 'string' ? JSON.parse(e.data) : e.data)?.listing_id)
    .filter(Boolean));

  const { opportunities } = await findListingsArbitrageOpportunities({
    brand,
    model,
    year: criteria.year || null,
    buyCountry,
    sellCountry,
    minMarginEur: minMargin,
    limit: 20,
    postedSinceDays: 7  // Only alert on listings posted in last 7 days
  });

  const newOnes = opportunities.filter(o => !seenIds.has(o.listingId));
  // Shape as listings for email (id, url, brand, model, year, price, mileage, etc.)
  return newOnes.map(o => ({
    id: o.listingId,
    listing_id: o.listingId,
    url: o.url,
    brand: o.brand,
    model: o.model,
    year: o.year,
    price: o.priceEur,
    mileage: o.mileage,
    location_city: o.location,
    location_country: buyCountry,
    market_price: o.medianSellPrice,
    net_margin: o.netMargin,
    net_margin_pct: o.netMarginPct
  }));
}

/**
 * Check for new listings matching alert criteria
 */
export async function checkNewListingsForAlert(alert) {
  try {
    const criteria = alert.criteria || {};
    const type = alert.type || 'new_listing';

    if (type === 'arbitrage') {
      return checkArbitrageAlert(alert);
    }
    
    // Build query based on alert criteria
    let query = supabase
      .from('listings')
      .select('*')
      .eq('status', 'active');

    // Apply filters from criteria
    if (criteria.brand && criteria.brand.length > 0) {
      query = query.in('brand', criteria.brand.map(b => b.toUpperCase()));
    }

    if (criteria.model && criteria.model.length > 0) {
      query = query.in('model', criteria.model.map(m => m.toUpperCase()));
    }

    if (criteria.year_min) {
      query = query.gte('year', criteria.year_min);
    }

    if (criteria.year_max) {
      query = query.lte('year', criteria.year_max);
    }

    if (criteria.price_min) {
      query = query.gte('price', criteria.price_min);
    }

    if (criteria.price_max) {
      query = query.lte('price', criteria.price_max);
    }

    if (criteria.mileage_min) {
      query = query.gte('mileage', criteria.mileage_min);
    }

    if (criteria.mileage_max) {
      query = query.lte('mileage', criteria.mileage_max);
    }

    if (criteria.fuel_type && criteria.fuel_type.length > 0) {
      query = query.in('fuel_type', criteria.fuel_type);
    }

    if (criteria.location_country) {
      query = query.eq('location_country', criteria.location_country);
    }

    // Get listings posted in the last 24 hours (or since last check)
    const lastCheck = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('posted_date', lastCheck);

    // Limit results
    query = query.limit(50);

    const { data: listings, error } = await query;

    if (error) {
      logger.error('Error checking new listings for alert', { error: error.message, alertId: alert.id });
      throw error;
    }

    // Filter out listings that already triggered this alert
    const existingEventIds = await getExistingAlertEventListingIds(alert.id);
    const newListings = (listings || []).filter(listing => 
      !existingEventIds.includes(listing.id)
    );

    return newListings;
  } catch (error) {
    logger.error('Error in checkNewListingsForAlert', { error: error.message, alertId: alert.id });
    throw error;
  }
}

/**
 * Get listing IDs that already triggered this alert
 */
async function getExistingAlertEventListingIds(alertId) {
  const { data, error } = await supabase
    .from('alert_events')
    .select('data')
    .eq('alert_id', alertId);

  if (error) {
    logger.warn('Error getting existing alert events', { error: error.message, alertId });
    return [];
  }

  // Extract listing IDs from event data
  return (data || [])
    .map(event => {
      try {
        const eventData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        return eventData.listing_id || eventData.id;
      } catch {
        return null;
      }
    })
    .filter(id => id !== null);
}

/**
 * Create alert event
 */
export async function createAlertEvent(alertId, userId, eventType, eventData) {
  const { data, error } = await supabase
    .from('alert_events')
    .insert({
      alert_id: alertId,
      user_id: userId,
      event_type: eventType,
      data: eventData
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating alert event', { error: error.message, alertId, userId });
    throw error;
  }

  return data;
}



