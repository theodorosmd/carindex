/**
 * Countries for sales aggregates and velocity (moyennes)
 * France, Allemagne, Norvège, Finlande, Danemark, Pays-Bas, Belgique, Luxembourg, Espagne, Italie, Suisse, Pologne
 */
export const AGGREGATE_COUNTRIES = [
  'FR', // France
  'DE', // Allemagne
  'NO', // Norvège
  'FI', // Finlande
  'DK', // Danemark
  'SE', // Suède
  'NL', // Pays-Bas
  'BE', // Belgique
  'LU', // Luxembourg
  'ES', // Espagne
  'IT', // Italie
  'CH', // Suisse
  'PL'  // Pologne
];

/** Rate to EUR (price / rate = EUR). Country codes (SE) and currency codes (SEK). */
const CURRENCY_TO_EUR = {
  SE: 11.49,   SEK: 11.49,  // Sweden
  NO: 11.7,    NOK: 11.7,   // Norway
  DK: 7.46,    DKK: 7.46,   // Denmark
  CH: 1.05,    CHF: 1.05,   // Switzerland
  PL: 4.3,     PLN: 4.3     // Poland
};

/**
 * Convert price to EUR. Uses listing currency when provided (e.g. mobile.de shows EUR for Swedish cars).
 * @param {number} price - Price value
 * @param {string} locationCountry - Country code (FR, SE, etc.)
 * @param {string} [currency] - Listing currency (EUR, SEK, etc.). If EUR, no conversion.
 */
export function toEUR(price, locationCountry, currency = null) {
  const p = parseFloat(price || 0);
  if (!p || p <= 0) return 0;
  const cur = String(currency || '').toUpperCase();
  if (cur === 'EUR' || cur === '€') return p;
  const rate = cur ? (CURRENCY_TO_EUR[cur] || null) : CURRENCY_TO_EUR[String(locationCountry || '').toUpperCase()];
  return rate ? p / rate : p;
}
