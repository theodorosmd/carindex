/**
 * Service d'arbitrage véhicule - détection d'opportunités cross-country
 */

import { supabase } from '../config/supabase.js';

/** Build direct listing URL from platform + id when url is not stored */
function buildListingUrlFromSource(platform, sourceId) {
  if (!sourceId) return null;
  const id = String(sourceId).trim();
  if (!id) return null;
  if (id.startsWith('http://') || id.startsWith('https://')) return id;
  if (!platform) return null;
  const p = String(platform).toLowerCase();
  if (p.includes('mobile') || p === 'mobilede') {
    return `https://suchen.mobile.de/fahrzeuge/details/${id}.html`;
  }
  if (p.includes('autoscout')) {
    return `https://www.autoscout24.de/offers/${id}`;
  }
  if (p === 'blocket') {
    return id.startsWith('http') ? id : `https://www.blocket.se/annons/${id}`;
  }
  if (p === 'finn') {
    return `https://www.finn.no/car/used/ad.html?finnkode=${id}`;
  }
  if (p === 'leboncoin') {
    return `https://www.leboncoin.fr/ad/voitures/${id}`;
  }
  if (p === 'bilweb' || p === 'bytbil') {
    return id.startsWith('http') ? id : `https://www.bilweb.se/annons/${id}`;
  }
  if (p === 'gaspedaal') {
    return id.startsWith('http') ? id : `https://www.gaspedaal.nl/occasion/${id}`;
  }
  return null;
}
import { logger } from '../utils/logger.js';
import { toEUR, AGGREGATE_COUNTRIES } from '../config/aggregateCountries.js';
import { estimateArbitrageMargin } from './importCostCalculator.js';

/**
 * Obtenir les prix médians par pays pour un modèle (brand, model, year)
 * Basé sur les annonces actives
 */
export async function getMedianPricesByCountry(brand, model, year = null, days = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const modelPattern = `%${(model || '').replace(/%/g, '')}%`;
  let query = supabase
    .from('listings')
    .select('id, price, location_country, currency')
    .eq('status', 'active')
    .in('location_country', AGGREGATE_COUNTRIES)
    .ilike('brand', brand)
    .ilike('model', modelPattern)
    .not('price', 'is', null)
    .gt('price', 0)
    .gte('last_seen', cutoff.toISOString());

  if (year) {
    query = query.eq('year', parseInt(year));
  }

  const { data: listings, error } = await query;

  if (error) {
    logger.error('Error fetching listings for arbitrage', { error: error.message, brand, model });
    throw new Error(`Failed to fetch prices: ${error.message}`);
  }

  const byCountry = new Map();
  for (const l of listings || []) {
    const c = (l.location_country || '').toUpperCase().slice(0, 2);
    if (!c) continue;
    const priceEur = toEUR(l.price, c, l.currency);
    if (!byCountry.has(c)) byCountry.set(c, []);
    byCountry.get(c).push(priceEur);
  }

  const result = [];
  for (const [country, prices] of byCountry) {
    const sorted = prices.filter(p => p > 0).sort((a, b) => a - b);
    const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    const avg = sorted.length > 0 ? sorted.reduce((s, p) => s + p, 0) / sorted.length : 0;
    result.push({
      country,
      count: sorted.length,
      medianPrice: Math.round(median),
      avgPrice: Math.round(avg),
      minPrice: sorted[0] ? Math.round(sorted[0]) : 0,
      maxPrice: sorted.length > 0 ? Math.round(sorted[sorted.length - 1]) : 0
    });
  }

  return result.sort((a, b) => a.medianPrice - b.medianPrice);
}

/**
 * Comparer les prix d'un modèle entre tous les pays
 */
export async function getPriceComparison(brand, model, year = null) {
  const prices = await getMedianPricesByCountry(brand, model, year);
  const globalMin = prices.length > 0 ? Math.min(...prices.map(p => p.medianPrice)) : 0;
  const globalMax = prices.length > 0 ? Math.max(...prices.map(p => p.medianPrice)) : 0;

  return {
    brand,
    model,
    year,
    byCountry: prices,
    globalMin,
    globalMax,
    priceSpread: globalMax - globalMin
  };
}

/**
 * Détecter les opportunités d'arbitrage
 * Pour chaque pays vendeur (prix bas), calculer la marge si on revend dans un pays acheteur (prix haut)
 */
export async function findArbitrageOpportunities(options = {}) {
  const {
    brand = null,
    model = null,
    year = null,
    minMarginEur = 2000,
    minMarginPct = 5,
    limit = 50
  } = options;

  if (!brand || !model) {
    return { opportunities: [], byCountry: [] };
  }

  const prices = await getMedianPricesByCountry(brand, model, year);
  if (prices.length < 2) return { opportunities: [], byCountry: prices };

  const opportunities = [];

  for (const buy of prices) {
    for (const sell of prices) {
      if (buy.country === sell.country) continue;
      if (buy.medianPrice >= sell.medianPrice) continue;

      const margin = estimateArbitrageMargin(
        buy.medianPrice,
        sell.medianPrice,
        buy.country,
        sell.country,
        { isProfessional: true }
      );

      if (margin.netMargin < minMarginEur && margin.netMarginPct < minMarginPct) continue;
      if (!margin.profitable) continue;

      opportunities.push({
        buyCountry: buy.country,
        sellCountry: sell.country,
        buyMedianPrice: buy.medianPrice,
        sellMedianPrice: sell.medianPrice,
        listingCount: { buy: buy.count, sell: sell.count },
        ...margin
      });
    }
  }

  opportunities.sort((a, b) => b.netMargin - a.netMargin);
  return {
    brand,
    model,
    year,
    opportunities: opportunities.slice(0, limit),
    byCountry: prices
  };
}

/**
 * Lister les opportunités depuis les annonces réelles (listings sous la médiane)
 */
export async function findListingsArbitrageOpportunities(options = {}) {
  const {
    brand,
    model,
    year = null,
    buyCountry,
    sellCountry,
    minMarginEur = 1500,
    limit = 20,
    postedSinceDays = null
  } = options;

  if (!brand || !model || !buyCountry || !sellCountry) {
    return { opportunities: [], medianSell: 0 };
  }

  const prices = await getMedianPricesByCountry(brand, model, year);
  const sellStat = prices.find(p => p.country === sellCountry);
  const medianSell = sellStat?.medianPrice || 0;
  if (medianSell <= 0) return { opportunities: [], medianSell };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const modelPattern = `%${(model || '').replace(/%/g, '')}%`;
  let query = supabase
    .from('listings')
    .select('id, brand, model, year, price, mileage, url, trim, version, source_platform, source_listing_id, location_country, location_city, posted_date, currency')
    .eq('status', 'active')
    .eq('location_country', buyCountry.toUpperCase())
    .ilike('brand', brand)
    .ilike('model', modelPattern)
    .not('price', 'is', null)
    .gt('price', 0)
    .gte('last_seen', cutoff.toISOString());

  if (year) query = query.eq('year', parseInt(year));

  // For alerts: only recent listings (posted in last N days) to avoid flooding on first run
  if (postedSinceDays) {
    const since = new Date();
    since.setDate(since.getDate() - postedSinceDays);
    query = query.gte('posted_date', since.toISOString());
  }

  const { data: listings, error } = await query.order('price', { ascending: true }).limit(100);

  if (error) {
    logger.error('Error fetching listings for arbitrage', { error: error.message });
    return { opportunities: [], medianSell };
  }

  // Fallback: fetch URLs from listing_sources when listings.url is empty
  const listingIds = (listings || []).map((l) => l.id);
  const urlsByListing = new Map();
  if (listingIds.length > 0) {
    try {
      const { data: sources } = await supabase
        .from('listing_sources')
        .select('listing_id, url')
        .in('listing_id', listingIds)
        .not('url', 'is', null)
        .neq('url', '');
      for (const s of sources || []) {
        if (!urlsByListing.has(s.listing_id) && s.url) {
          urlsByListing.set(s.listing_id, s.url);
        }
      }
    } catch {
      // listing_sources table may not exist
    }
  }

  const opportunities = [];
  for (const l of listings || []) {
    const priceEur = toEUR(l.price, l.location_country, l.currency);
    const margin = estimateArbitrageMargin(priceEur, medianSell, buyCountry, sellCountry);

    if (margin.netMargin < minMarginEur) continue;

    const listingUrl = l.url || urlsByListing.get(l.id) || buildListingUrlFromSource(l.source_platform, l.source_listing_id);

    opportunities.push({
      listingId: l.id,
      brand: l.brand,
      model: l.model,
      year: l.year,
      price: l.price,
      priceEur: Math.round(priceEur),
      mileage: l.mileage,
      url: listingUrl,
      trim: l.trim || l.version || null,
      location: l.location_city || l.location_country,
      medianSellPrice: medianSell,
      ...margin
    });
  }

  return {
    opportunities: opportunities.slice(0, limit),
    medianSell
  };
}

/**
 * Get top listings for an arbitrage opportunity (exact car ads with finition).
 * Returns up to `limit` listings with url, trim, priceEur for direct links.
 */
export async function getTopListingUrls(brand, model, buyCountry, sellCountry, limit = 3) {
  const { opportunities } = await findListingsArbitrageOpportunities({
    brand,
    model,
    year: null,
    buyCountry,
    sellCountry,
    minMarginEur: 0,
    limit
  });
  return (opportunities || [])
    .filter(o => o.url)
    .map(o => ({ url: o.url, trim: o.trim, priceEur: o.priceEur }));
}
