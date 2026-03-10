/**
 * Normalize fuel types and transmissions from multiple sources (mobile.de, AutoScout24, etc.)
 * to canonical values for facets display and filtering.
 */

// Raw DB values → canonical display value (case-insensitive match)
const FUEL_RAW_TO_CANONICAL = {
  diesel: 'DIESEL',
  petrol: 'PETROL',
  benzine: 'PETROL',
  benzin: 'PETROL',
  benzina: 'PETROL',
  gasoline: 'PETROL',
  gasolina: 'PETROL',
  essence: 'PETROL',
  bensin: 'PETROL',
  elektrisch: 'ELECTRIC',
  elektro: 'ELECTRIC',
  electrique: 'ELECTRIC',
  électrique: 'ELECTRIC',
  elettrica: 'ELECTRIC',
  eléctrico: 'ELECTRIC',
  electric: 'ELECTRIC',
  'elettrica/benzina': 'HYBRID',
  'elektro/benzine': 'HYBRID',
  'elektro/benzin': 'HYBRID',
  'elektrisch/benzine': 'HYBRID',
  'electro/gasolina': 'HYBRID',
  hybrid: 'HYBRID',
  'plug-in': 'HYBRID',
  plugin: 'HYBRID',
  gpl: 'LPG',
  lpg: 'LPG',
  metano: 'CNG',
  cng: 'CNG',
  autogas: 'LPG',
  autres: 'OTHER',
  other: 'OTHER',
  sonstige: 'OTHER'
};

const TRANSMISSION_RAW_TO_CANONICAL = {
  automatic: 'AUTOMATIC',
  automatik: 'AUTOMATIC',
  automatique: 'AUTOMATIC',
  automatico: 'AUTOMATIC',
  automat: 'AUTOMATIC',
  auto: 'AUTOMATIC',
  manual: 'MANUAL',
  manuelle: 'MANUAL',
  manuel: 'MANUAL',
  manuale: 'MANUAL',
  schaltgetriebe: 'MANUAL',
  handgeschakeld: 'MANUAL',
  manuell: 'MANUAL',
  sequenziale: 'MANUAL'
};

/** Normalize fuel type to canonical (DIESEL, PETROL, ELECTRIC, HYBRID, LPG, CNG, OTHER) */
export function normalizeFuelType(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.toLowerCase().trim();
  if (FUEL_RAW_TO_CANONICAL[key]) return FUEL_RAW_TO_CANONICAL[key];
  // Pattern-based for compound values
  if (/elektro|elektrisch|electr|elettric|eléctric/i.test(key) && /benz|petrol|gasolin/i.test(key)) return 'HYBRID';
  if (/elektro|elektrisch|electr|elettric|eléctric/i.test(key)) return 'ELECTRIC';
  if (/diesel/i.test(key)) return 'DIESEL';
  if (/benz|petrol|gasolin|essence|bensin/i.test(key)) return 'PETROL';
  if (/gpl|lpg|autogas/i.test(key)) return 'LPG';
  if (/metano|cng/i.test(key)) return 'CNG';
  if (/hybrid|plug-in|plugin/i.test(key)) return 'HYBRID';
  return raw.toUpperCase(); // keep unknown as-is
}

/** Normalize transmission to canonical (AUTOMATIC, MANUAL) */
export function normalizeTransmission(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.toLowerCase().trim();
  if (TRANSMISSION_RAW_TO_CANONICAL[key]) return TRANSMISSION_RAW_TO_CANONICAL[key];
  if (/auto|automat|tronic|dsg|tiptronic|powershift|robot/i.test(key)) return 'AUTOMATIC';
  if (/manu|schalt|handges|bvm|manual/i.test(key)) return 'MANUAL';
  return raw.toUpperCase();
}

// Canonical → raw DB values (as stored by scrapers)
const FUEL_CANONICAL_TO_RAW = {
  DIESEL: ['DIESEL', 'Diesel', 'diesel'],
  PETROL: ['PETROL', 'BENZINE', 'BENZIN', 'BENZINA', 'GASOLINE', 'GASOLINA', 'Petrol', 'Benzine', 'Benzin', 'Essence', 'Bensin'],
  ELECTRIC: ['ELEKTRISCH', 'ELEKTRO', 'ELECTRIQUE', 'ELETTRICA', 'ELÉCTRICO', 'ELECTRIC', 'Elektrisch', 'Elektro'],
  HYBRID: ['ELETTRICA/BENZINA', 'ELEKTRO/BENZINE', 'ELEKTRO/BENZIN', 'ELEKTRISCH/BENZINE', 'ELECTRO/GASOLINA', 'Hybrid', 'Plug-in'],
  LPG: ['GPL', 'LPG', 'Autogas'],
  CNG: ['METANO', 'CNG'],
  OTHER: ['AUTRES', 'OTHER', 'SONSTIGE', 'Autres']
};

const TRANSMISSION_CANONICAL_TO_RAW = {
  AUTOMATIC: ['AUTOMATIC', 'AUTOMATIK', 'AUTOMATIQUE', 'AUTOMATICO', 'AUTOMAT', 'Automatic', 'Automatik'],
  MANUAL: ['MANUAL', 'MANUELLE', 'MANUEL', 'MANUALE', 'SCHALTGETRIEBE', 'HANDGESCHAKELD', 'MANUELL', 'Manual', 'Manuelle', 'Schaltgetriebe', 'Handgeschakeld']
};

/** Expand canonical or raw fuel value to raw DB values for filtering */
export function expandFuelCanonicalToRaw(canonical) {
  if (canonical == null || typeof canonical !== 'string') return [];
  const c = canonical.trim().toUpperCase();
  if (!c) return [];
  let raw = FUEL_CANONICAL_TO_RAW[c];
  if (!raw) {
    const normalized = normalizeFuelType(canonical);
    raw = normalized ? FUEL_CANONICAL_TO_RAW[normalized] : null;
  }
  return raw ? [...raw] : [canonical];
}

/** Expand canonical or raw transmission to raw DB values for filtering */
export function expandTransmissionCanonicalToRaw(canonical) {
  if (canonical == null || typeof canonical !== 'string') return [];
  const c = canonical.trim().toUpperCase();
  if (!c) return [];
  let raw = TRANSMISSION_CANONICAL_TO_RAW[c];
  if (!raw) {
    const normalized = normalizeTransmission(canonical);
    raw = normalized ? TRANSMISSION_CANONICAL_TO_RAW[normalized] : null;
  }
  return raw ? [...raw] : [canonical];
}
