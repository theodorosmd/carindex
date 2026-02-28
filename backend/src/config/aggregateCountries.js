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

/** Rate to EUR (price / rate = EUR). Non-EUR countries only. */
const CURRENCY_TO_EUR = {
  SE: 11.49,   // SEK (legacy/data compat)
  NO: 11.7,    // NOK
  DK: 7.46,    // DKK
  CH: 1.05,    // CHF
  PL: 4.3      // PLN
};

/**
 * Convert price to EUR from listing country's currency
 */
export function toEUR(price, locationCountry) {
  const p = parseFloat(price || 0);
  if (!p || p <= 0) return 0;
  const rate = CURRENCY_TO_EUR[String(locationCountry || '').toUpperCase()];
  return rate ? p / rate : p;
}
