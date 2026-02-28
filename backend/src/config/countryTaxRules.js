/**
 * Règles fiscales et coûts par pays pour l'arbitrage véhicule
 * TVA, transport, homologation, frais administratifs
 */

import { AGGREGATE_COUNTRIES } from './aggregateCountries.js';

/** TVA par pays (en %) */
export const VAT_RATES = {
  FR: 20,
  DE: 19,
  BE: 21,
  LU: 17,
  NL: 21,
  ES: 21,
  IT: 22,
  AT: 20,
  PT: 23,
  FI: 24,
  NO: 25,
  DK: 25,
  SE: 25,
  PL: 23,
  CH: 7.7,  // TVA réduite véhicules
  GB: 20,
  IE: 23
};

/** Pays UE (TVA récupérable entre professionnels assujettis) */
export const EU_COUNTRIES = ['FR', 'DE', 'BE', 'LU', 'NL', 'ES', 'IT', 'AT', 'PT', 'FI', 'PL', 'IE', 'SE', 'DK'];

/** Coût transport estimé entre pays (EUR) - matrice simplifiée par distance/région */
const TRANSPORT_BASE_KM = 0.5; // €/km approximatif
const TRANSPORT_MIN = 300;
const TRANSPORT_MAX = 1200;

/** Distances approximatives entre capitales (km) - pour estimation transport */
const DISTANCES_KM = {
  'FR-DE': 450, 'FR-BE': 260, 'FR-LU': 280, 'FR-NL': 430, 'FR-ES': 1050, 'FR-IT': 960,
  'FR-CH': 470, 'FR-PL': 1350, 'FR-DK': 1030, 'FR-NO': 1450, 'FR-FI': 2150,
  'DE-BE': 260, 'DE-LU': 190, 'DE-NL': 230, 'DE-ES': 1850, 'DE-IT': 960,
  'DE-CH': 850, 'DE-PL': 570, 'DE-DK': 360, 'DE-NO': 880, 'DE-FI': 1640,
  'BE-NL': 180, 'BE-LU': 190, 'BE-ES': 1450, 'BE-IT': 1150, 'BE-CH': 660,
  'BE-PL': 1190, 'BE-DK': 780, 'BE-NO': 1300, 'BE-FI': 2050,
  'NL-DE': 230, 'NL-LU': 330, 'NL-ES': 1680, 'NL-IT': 1190, 'NL-CH': 830,
  'NL-PL': 1130, 'NL-DK': 620, 'NL-NO': 1140, 'NL-FI': 1890,
  'ES-IT': 1400, 'ES-CH': 1500, 'ES-PL': 2400, 'ES-DK': 2300, 'ES-NO': 2700, 'ES-FI': 3200,
  'IT-CH': 680, 'IT-PL': 1300, 'IT-DK': 1580, 'IT-NO': 1920, 'IT-FI': 2470,
  'CH-PL': 1420, 'CH-DK': 1200, 'CH-NO': 1540, 'CH-FI': 2090,
  'PL-DK': 900, 'PL-NO': 1150, 'PL-FI': 1540,
  'DK-NO': 600, 'DK-FI': 990, 'DK-SE': 620,
  'NO-FI': 1020, 'NO-SE': 520,
  'FI-SE': 420,
  'SE-DE': 830, 'SE-PL': 1050
};

function getDistance(from, to) {
  if (from === to) return 0;
  const key = [from, to].sort().join('-');
  return DISTANCES_KM[key] || 800; // défaut 800 km
}

/**
 * Estimer le coût de transport entre deux pays (EUR)
 */
export function estimateTransportCost(fromCountry, toCountry) {
  const d = getDistance(fromCountry, toCountry);
  if (d <= 0) return 0;
  const cost = Math.round(d * TRANSPORT_BASE_KM);
  return Math.min(TRANSPORT_MAX, Math.max(TRANSPORT_MIN, cost));
}

/** Frais d'homologation / immatriculation par pays de destination (EUR) */
const REGISTRATION_COSTS = {
  FR: 350,
  DE: 150,
  BE: 250,
  LU: 200,
  NL: 150,
  ES: 300,
  IT: 250,
  PL: 150,
  NO: 400,
  DK: 250,
  FI: 400,
  SE: 350,
  CH: 500
};

export function getRegistrationCost(country) {
  return REGISTRATION_COSTS[country] || 250;
}

/** TVA récupérable ? (professionnel assujetti achète dans UE pour revendre dans UE) */
export function isVATRecoverable(buyCountry, sellCountry, isProfessional = true) {
  if (!isProfessional) return false;
  const buyEU = EU_COUNTRIES.includes(buyCountry);
  const sellEU = EU_COUNTRIES.includes(sellCountry);
  return buyEU && sellEU;
}

/** Obtenir le taux de TVA d'un pays */
export function getVATRate(country) {
  return VAT_RATES[country] || 20;
}
