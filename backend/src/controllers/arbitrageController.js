/**
 * Controller pour l'arbitrage véhicule cross-country
 */

import { logger } from '../utils/logger.js';
import { supabase } from '../config/supabase.js';
import {
  getPriceComparison,
  findArbitrageOpportunities,
  findListingsArbitrageOpportunities,
  getTopListingUrls
} from '../services/arbitrageService.js';
import { calculateImportCosts, estimateArbitrageMargin } from '../services/importCostCalculator.js';
import { AGGREGATE_COUNTRIES } from '../config/aggregateCountries.js';
import {
  estimateTransportCost,
  getRegistrationCost,
  getVATRate
} from '../config/countryTaxRules.js';

/** Noms des pays */
const COUNTRY_NAMES = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', LU: 'Luxembourg', NL: 'Pays-Bas',
  ES: 'Espagne', IT: 'Italie', CH: 'Suisse', PL: 'Pologne', NO: 'Norvège',
  DK: 'Danemark', FI: 'Finlande', SE: 'Suède'
};

/**
 * Comparaison des prix par pays
 */
export async function getPriceComparisonEndpoint(req, res, next) {
  try {
    const { brand, model, year } = req.query;
    if (!brand || !model) {
      return res.status(400).json({
        success: false,
        error: 'brand et model requis'
      });
    }

    const comparison = await getPriceComparison(
      brand,
      model,
      year ? parseInt(year) : null
    );

    res.json({
      success: true,
      ...comparison,
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error in price comparison', { error: error.message });
    next(error);
  }
}

/**
 * Opportunités d'arbitrage (analyse par paires de pays)
 */
export async function getArbitrageOpportunitiesEndpoint(req, res, next) {
  try {
    const { brand, model, year, minMarginEur = 2000, minMarginPct = 5, limit = 50 } = req.query;

    if (!brand || !model) {
      return res.status(400).json({
        success: false,
        error: 'brand et model requis'
      });
    }

    const result = await findArbitrageOpportunities({
      brand,
      model,
      year: year ? parseInt(year) : null,
      minMarginEur: parseInt(minMarginEur) || 2000,
      minMarginPct: parseFloat(minMarginPct) || 5,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      ...result,
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error finding arbitrage opportunities', { error: error.message });
    next(error);
  }
}

/**
 * Annonces avec opportunité d'arbitrage (listings réels)
 */
export async function getListingsArbitrageEndpoint(req, res, next) {
  try {
    const { brand, model, year, buyCountry, sellCountry, minMarginEur = 1500, limit = 20 } = req.query;

    if (!brand || !model || !buyCountry || !sellCountry) {
      return res.status(400).json({
        success: false,
        error: 'brand, model, buyCountry et sellCountry requis'
      });
    }

    const result = await findListingsArbitrageOpportunities({
      brand,
      model,
      year: year ? parseInt(year) : null,
      buyCountry: buyCountry.toUpperCase(),
      sellCountry: sellCountry.toUpperCase(),
      minMarginEur: parseInt(minMarginEur) || 1500,
      limit: parseInt(limit) || 20
    });

    res.json({
      success: true,
      ...result,
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error finding listings arbitrage', { error: error.message });
    next(error);
  }
}

/**
 * Simulateur de coûts d'import
 */
export async function getImportCostSimulatorEndpoint(req, res, next) {
  try {
    const { purchasePrice, buyCountry, sellCountry, isProfessional = true, reconditioningEur } = req.query;

    if (!purchasePrice || !buyCountry || !sellCountry) {
      return res.status(400).json({
        success: false,
        error: 'purchasePrice, buyCountry et sellCountry requis'
      });
    }

    const options = { isProfessional: isProfessional !== 'false' };
    if (reconditioningEur != null && reconditioningEur !== '') {
      const val = parseFloat(reconditioningEur);
      if (!isNaN(val) && val >= 0) options.reconditioningEur = val;
    }

    const costs = calculateImportCosts(
      parseFloat(purchasePrice),
      buyCountry.toUpperCase(),
      sellCountry.toUpperCase(),
      options
    );

    res.json({
      success: true,
      ...costs,
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error in import cost simulator', { error: error.message });
    next(error);
  }
}

/**
 * Estimer la marge d'arbitrage
 */
export async function getArbitrageMarginEstimateEndpoint(req, res, next) {
  try {
    const { purchasePrice, sellPrice, buyCountry, sellCountry, reconditioningEur } = req.query;

    if (!purchasePrice || !sellPrice || !buyCountry || !sellCountry) {
      return res.status(400).json({
        success: false,
        error: 'purchasePrice, sellPrice, buyCountry et sellCountry requis'
      });
    }

    const options = {};
    if (reconditioningEur != null && reconditioningEur !== '') {
      const val = parseFloat(reconditioningEur);
      if (!isNaN(val) && val >= 0) options.reconditioningEur = val;
    }

    const margin = estimateArbitrageMargin(
      parseFloat(purchasePrice),
      parseFloat(sellPrice),
      buyCountry.toUpperCase(),
      sellCountry.toUpperCase(),
      options
    );

    res.json({
      success: true,
      ...margin,
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error estimating arbitrage margin', { error: error.message });
    next(error);
  }
}

/**
 * Opportunités auto-détectées (remplies par le job quotidien).
 * Enriched with exact listing URLs for direct links to car ads.
 */
export async function getAutoDetectedEndpoint(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 500, 2000); // Return all opportunities ≥€4000

    const { data, error } = await supabase
      .from('arbitrage_opportunities_detected')
      .select('*')
      .gte('net_margin', 4000);

    if (error) {
      throw new Error(error.message);
    }

    const baseOpportunities = (data || [])
      .filter((o) => (o.listing_count_buy || 0) >= 3 && (o.net_margin || 0) >= 4000)
      .sort((a, b) => {
        const liqA = (a.listing_count_buy || 0) + (a.listing_count_sell || 0);
        const liqB = (b.listing_count_buy || 0) + (b.listing_count_sell || 0);
        if (liqB !== liqA) return liqB - liqA;
        return (b.net_margin || 0) - (a.net_margin || 0);
      })
      .slice(0, limit);

    const opportunities = await Promise.all(
      baseOpportunities.map(async (o) => {
        let listings = o.top_listings || [];
        if (listings.length === 0) {
          try {
            listings = await getTopListingUrls(
              o.brand,
              o.model,
              o.buy_country,
              o.sell_country,
              3
            );
          } catch (e) {
            // Ignore
          }
        }
        return { ...o, listings };
      })
    );

    res.json({
      success: true,
      opportunities,
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error fetching auto-detected opportunities', { error: error.message });
    next(error);
  }
}

/**
 * Règles fiscales et coûts (référence)
 */
export async function getTaxRulesEndpoint(req, res, next) {
  try {
    const from = req.query.from?.toUpperCase();
    const to = req.query.to?.toUpperCase();

    const rules = AGGREGATE_COUNTRIES.map(code => ({
      code,
      name: COUNTRY_NAMES[code] || code,
      vatRate: getVATRate(code),
      registrationCost: getRegistrationCost(code)
    }));

    let transportCost = null;
    if (from && to) {
      transportCost = {
        from,
        to,
        cost: estimateTransportCost(from, to)
      };
    }

    res.json({
      success: true,
      countries: rules,
      transportCost,
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error getting tax rules', { error: error.message });
    next(error);
  }
}
