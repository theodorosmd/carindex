/**
 * Auto-detect arbitrage opportunities across all models
 * Runs daily, stores top opportunities in arbitrage_opportunities_detected
 */

import cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { findArbitrageOpportunities } from '../services/arbitrageService.js';
import { AGGREGATE_COUNTRIES } from '../config/aggregateCountries.js';

const MIN_COUNTRIES = 2;
const MIN_MARGIN_EUR = 1500;
const MAX_MODELS_TO_SCAN = 80;
const MAX_OPPORTUNITIES_TO_STORE = 100;

/**
 * Get top brand+model combinations with listings in 2+ countries
 */
async function getModelsWithCrossCountryListings() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const { data: listings, error } = await supabase
    .from('listings')
    .select('brand, model, year, location_country')
    .eq('status', 'active')
    .in('location_country', AGGREGATE_COUNTRIES)
    .not('price', 'is', null)
    .gt('price', 0)
    .gte('last_seen', cutoff.toISOString());

  if (error) {
    throw new Error(`Failed to fetch listings: ${error.message}`);
  }

  const byModel = new Map();
  for (const l of listings || []) {
    const brand = (l.brand || '').trim().toLowerCase();
    const model = (l.model || '').trim().toLowerCase();
    if (!brand || !model) continue;
    const key = `${brand}|${model}`;
    if (!byModel.has(key)) {
      byModel.set(key, { brand, model, countries: new Map() });
    }
    const c = (l.location_country || '').toUpperCase().slice(0, 2);
    if (!c) continue;
    const count = (byModel.get(key).countries.get(c) || 0) + 1;
    byModel.get(key).countries.set(c, count);
  }

  const candidates = [];
  for (const [_, m] of byModel) {
    const countries = Array.from(m.countries.keys());
    if (countries.length >= MIN_COUNTRIES) {
      candidates.push({
        brand: m.brand,
        model: m.model,
        countryCount: countries.length,
        totalListings: Array.from(m.countries.values()).reduce((a, b) => a + b, 0)
      });
    }
  }

  candidates.sort((a, b) => b.totalListings - a.totalListings);
  return candidates.slice(0, MAX_MODELS_TO_SCAN);
}

/**
 * Run auto-detection and store results
 */
export async function runArbitrageDetection() {
  try {
    logger.info('Arbitrage auto-detection started');

    const models = await getModelsWithCrossCountryListings();
    logger.info(`Scanning ${models.length} models for arbitrage opportunities`);

    const allOpportunities = [];

    for (const m of models) {
      try {
        const result = await findArbitrageOpportunities({
          brand: m.brand,
          model: m.model,
          year: null,
          minMarginEur: MIN_MARGIN_EUR,
          minMarginPct: 3,
          limit: 10
        });

        for (const opp of result.opportunities || []) {
          allOpportunities.push({
            brand: m.brand,
            model: m.model,
            year: null,
            buy_country: opp.buyCountry,
            sell_country: opp.sellCountry,
            buy_median_price: opp.buyMedianPrice,
            sell_median_price: opp.sellMedianPrice,
            net_margin: opp.netMargin,
            net_margin_pct: opp.netMarginPct,
            listing_count_buy: opp.listingCount?.buy || 0,
            listing_count_sell: opp.listingCount?.sell || 0
          });
        }
      } catch (err) {
        logger.warn('Error scanning model', { brand: m.brand, model: m.model, error: err.message });
      }
    }

    allOpportunities.sort((a, b) => b.net_margin - a.net_margin);
    const toStore = allOpportunities.slice(0, MAX_OPPORTUNITIES_TO_STORE);

    if (toStore.length === 0) {
      logger.info('No arbitrage opportunities detected');
      return { count: 0 };
    }

    // Clear old and insert new
    await supabase.from('arbitrage_opportunities_detected').delete().neq('id', 0);

    const { error: insertError } = await supabase
      .from('arbitrage_opportunities_detected')
      .insert(toStore.map(o => ({
        brand: o.brand,
        model: o.model,
        year: o.year,
        buy_country: o.buy_country,
        sell_country: o.sell_country,
        buy_median_price: Math.round(o.buy_median_price),
        sell_median_price: Math.round(o.sell_median_price),
        net_margin: Math.round(o.net_margin),
        net_margin_pct: Math.min(99999.99, Math.round((o.net_margin_pct || 0) * 100) / 100),
        listing_count_buy: o.listing_count_buy || 0,
        listing_count_sell: o.listing_count_sell || 0
      })));

    if (insertError) {
      throw new Error(`Failed to store opportunities: ${insertError.message}`);
    }

    logger.info('Arbitrage auto-detection completed', {
      modelsScanned: models.length,
      opportunitiesFound: allOpportunities.length,
      opportunitiesStored: toStore.length
    });

    return {
      count: toStore.length,
      topMargin: toStore[0]?.net_margin
    };
  } catch (error) {
    logger.error('Arbitrage auto-detection failed', { error: error.message });
    throw error;
  }
}

export function startArbitrageDetectionJob() {
  logger.info('Starting arbitrage detection job (daily at 4:00)');

  cron.schedule('0 4 * * *', async () => {
    try {
      await runArbitrageDetection();
    } catch (error) {
      logger.error('Arbitrage detection job failed', { error: error.message });
    }
  }, { scheduled: true, timezone: 'Europe/Paris' });

  logger.info('Arbitrage detection job scheduled');
}
