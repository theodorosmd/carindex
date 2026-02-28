/**
 * Calculateur de coûts d'import/export pour arbitrage véhicule
 */

import {
  estimateTransportCost,
  getRegistrationCost,
  getVATRate,
  isVATRecoverable
} from '../config/countryTaxRules.js';

/**
 * Calculer les coûts totaux d'import d'un véhicule
 * @param {number} purchasePriceEur - Prix d'achat en EUR
 * @param {string} buyCountry - Pays d'achat (ex: DE)
 * @param {string} sellCountry - Pays de vente (ex: FR)
 * @param {object} options - { isProfessional, transportCostOverride }
 * @returns {object} { totalCost, breakdown, netMargin (si sellPrice fourni) }
 */
export function calculateImportCosts(purchasePriceEur, buyCountry, sellCountry, options = {}) {
  const { isProfessional = true, transportCostOverride } = options;
  const buy = (buyCountry || '').toUpperCase().slice(0, 2);
  const sell = (sellCountry || '').toUpperCase().slice(0, 2);

  const transport = transportCostOverride ?? estimateTransportCost(buy, sell);
  const registration = getRegistrationCost(sell);

  // TVA à l'achat (si applicable)
  const vatRateBuy = getVATRate(buy);
  const vatAtPurchase = purchasePriceEur * (vatRateBuy / 100);
  const vatRecoverable = isVATRecoverable(buy, sell, isProfessional);
  const vatNetCost = vatRecoverable ? 0 : vatAtPurchase;

  const totalCost = Math.round(transport + registration + vatNetCost);

  const breakdown = {
    purchasePrice: Math.round(purchasePriceEur),
    transport,
    registration,
    vatAtPurchase: Math.round(vatAtPurchase),
    vatRecoverable,
    vatNetCost: Math.round(vatNetCost),
    totalCost
  };

  return {
    purchasePrice: Math.round(purchasePriceEur),
    totalCost,
    breakdown,
    costToSellCountry: Math.round(purchasePriceEur + totalCost)
  };
}

/**
 * Estimer la marge nette d'arbitrage
 * @param {number} purchasePriceEur - Prix achat
 * @param {number} expectedSellPriceEur - Prix de vente attendu
 * @param {string} buyCountry - Pays achat
 * @param {string} sellCountry - Pays vente
 * @param {object} options - options pour calculateImportCosts
 */
export function estimateArbitrageMargin(purchasePriceEur, expectedSellPriceEur, buyCountry, sellCountry, options = {}) {
  const { totalCost, costToSellCountry } = calculateImportCosts(
    purchasePriceEur,
    buyCountry,
    sellCountry,
    options
  );

  const grossMargin = expectedSellPriceEur - purchasePriceEur;
  const netMargin = expectedSellPriceEur - costToSellCountry;
  const netMarginPct = costToSellCountry > 0 ? (netMargin / costToSellCountry) * 100 : 0;

  return {
    purchasePrice: Math.round(purchasePriceEur),
    expectedSellPrice: Math.round(expectedSellPriceEur),
    totalImportCost: totalCost,
    costToSellCountry,
    grossMargin: Math.round(grossMargin),
    netMargin: Math.round(netMargin),
    netMarginPct: Math.round(netMarginPct * 10) / 10,
    profitable: netMargin > 0
  };
}
