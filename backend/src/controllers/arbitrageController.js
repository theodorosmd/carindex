/**
 * Controller pour l'arbitrage véhicule cross-country
 */

import { logger } from '../utils/logger.js';
import { supabase } from '../config/supabase.js';
import {
  getPriceComparison,
  findArbitrageOpportunities,
  findListingsArbitrageOpportunities
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
export async function getPriceComparisonEndpoint(req, res) {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Opportunités d'arbitrage (analyse par paires de pays)
 */
export async function getArbitrageOpportunitiesEndpoint(req, res) {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Annonces avec opportunité d'arbitrage (listings réels)
 */
export async function getListingsArbitrageEndpoint(req, res) {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Simulateur de coûts d'import
 */
export async function getImportCostSimulatorEndpoint(req, res) {
  try {
    const { purchasePrice, buyCountry, sellCountry, isProfessional = true } = req.query;

    if (!purchasePrice || !buyCountry || !sellCountry) {
      return res.status(400).json({
        success: false,
        error: 'purchasePrice, buyCountry et sellCountry requis'
      });
    }

    const costs = calculateImportCosts(
      parseFloat(purchasePrice),
      buyCountry.toUpperCase(),
      sellCountry.toUpperCase(),
      { isProfessional: isProfessional !== 'false' }
    );

    res.json({
      success: true,
      ...costs,
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error in import cost simulator', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Estimer la marge d'arbitrage
 */
export async function getArbitrageMarginEstimateEndpoint(req, res) {
  try {
    const { purchasePrice, sellPrice, buyCountry, sellCountry } = req.query;

    if (!purchasePrice || !sellPrice || !buyCountry || !sellCountry) {
      return res.status(400).json({
        success: false,
        error: 'purchasePrice, sellPrice, buyCountry et sellCountry requis'
      });
    }

    const margin = estimateArbitrageMargin(
      parseFloat(purchasePrice),
      parseFloat(sellPrice),
      buyCountry.toUpperCase(),
      sellCountry.toUpperCase()
    );

    res.json({
      success: true,
      ...margin,
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error estimating arbitrage margin', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Opportunités auto-détectées (remplies par le job quotidien)
 */
export async function getAutoDetectedEndpoint(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const { data, error } = await supabase
      .from('arbitrage_opportunities_detected')
      .select('*')
      .order('net_margin', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      opportunities: data || [],
      countryNames: COUNTRY_NAMES
    });
  } catch (error) {
    logger.error('Error fetching auto-detected opportunities', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Règles fiscales et coûts (référence)
 */
export async function getTaxRulesEndpoint(req, res) {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
