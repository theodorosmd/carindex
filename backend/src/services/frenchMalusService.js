/**
 * French Ecological Malus Service
 * 
 * Main service for calculating French ecological malus taxes
 * Implements eligibility checks, table selection, base malus lookup,
 * age-based décote (reduction), and optional weight-based malus
 */

import { getTableVersion, getBaseMalus } from './frenchMalusCo2Tables.js';
import { computeWeightMalus } from './frenchMalusWeightService.js';
import { logger } from '../utils/logger.js';

/**
 * Compute French ecological malus
 * 
 * Pure function that calculates malus based on vehicle characteristics
 * 
 * @param {Object} input - Input parameters
 * @param {number|null} input.co2_g_km_wltp - CO2 emissions in g/km (WLTP)
 * @param {string|null} input.first_registration_date - ISO date (YYYY-MM-DD) of first registration abroad
 * @param {string} input.registration_in_france_date - ISO date (YYYY-MM-DD) for registration in France (default: today)
 * @param {boolean} input.is_first_registration_in_france - True if vehicle has NEVER been registered in France
 * @param {string} input.vehicle_category - Vehicle category: "VP" (passenger car), "VUL" (light commercial), "OTHER"
 * @param {number|null} input.mass_kg - Vehicle mass in running order (kg)
 * @param {boolean} input.enable_weight_malus - Whether to calculate weight-based malus
 * @returns {Object} Result object with malus amounts and debug information
 */
export function computeFrenchMalus(input) {
  const {
    co2_g_km_wltp,
    first_registration_date,
    registration_in_france_date,
    is_first_registration_in_france,
    vehicle_category,
    mass_kg,
    enable_weight_malus = false
  } = input;

  const debug = {
    co2_table_version: null,
    base_malus_co2: 0,
    years_started: 0,
    decote_factor: 1.0,
    notes: []
  };

  // Default registration date to today if not provided
  const regDate = registration_in_france_date || new Date().toISOString().split('T')[0];

  // A) Eligibility checks

  // A1: Only VP (passenger cars) are subject to malus
  if (vehicle_category !== 'VP') {
    debug.notes.push(`Vehicle category is "${vehicle_category}", not VP. No malus applies.`);
    return {
      malus_co2_eur: 0,
      malus_masse_eur: 0,
      total_malus_eur: 0,
      debug
    };
  }

  // A2: If already registered in France, no malus on subsequent registration
  if (!is_first_registration_in_france) {
    debug.notes.push('Vehicle has already been registered in France. No malus applies to subsequent registrations.');
    return {
      malus_co2_eur: 0,
      malus_masse_eur: 0,
      total_malus_eur: 0,
      debug
    };
  }

  // A3: CO2 is required
  if (co2_g_km_wltp === null || co2_g_km_wltp === undefined || isNaN(co2_g_km_wltp)) {
    debug.notes.push('CO2 emissions (co2_g_km_wltp) is missing. Cannot calculate malus.');
    return {
      malus_co2_eur: 0,
      malus_masse_eur: 0,
      total_malus_eur: 0,
      debug,
      error: 'MISSING_CO2_DATA'
    };
  }

  // B) Table selection based on registration date
  const tableVersion = getTableVersion(regDate);
  debug.co2_table_version = tableVersion.id;
  debug.notes.push(`Using table version: ${tableVersion.name} (${tableVersion.startDate} to ${tableVersion.endDate})`);

  // C) Base malus lookup
  const baseMalusCo2 = getBaseMalus(tableVersion.id, co2_g_km_wltp);
  debug.base_malus_co2 = baseMalusCo2;

  if (baseMalusCo2 === 0) {
    debug.notes.push(`CO2 emissions (${co2_g_km_wltp} g/km) are below threshold (${tableVersion.threshold} g/km). No base malus.`);
  } else {
    debug.notes.push(`Base CO2 malus: ${baseMalusCo2} EUR for ${co2_g_km_wltp} g/km`);
  }

  // D) Age-based décote (reduction)
  let yearsStarted = 0;
  let decoteFactor = 1.0;

  if (first_registration_date) {
    try {
      const firstRegDate = new Date(first_registration_date);
      const regInFRDate = new Date(regDate);

      if (isNaN(firstRegDate.getTime()) || isNaN(regInFRDate.getTime())) {
        debug.notes.push('Invalid date format. Décote not applied.');
      } else {
        // Calculate months difference
        const monthsDiff = (regInFRDate.getFullYear() - firstRegDate.getFullYear()) * 12 +
                          (regInFRDate.getMonth() - firstRegDate.getMonth());

        // Calculate years started: ceil(months_diff / 12)
        // If months_diff > 0, we use Math.ceil to count any partial year as a full year started
        if (monthsDiff > 0) {
          yearsStarted = Math.ceil(monthsDiff / 12);
        } else {
          yearsStarted = 0;
        }

        debug.years_started = yearsStarted;

        // Apply -10% per year started
        // decote_factor = max(0, 1 - (years_started * 0.10))
        decoteFactor = Math.max(0, 1 - (yearsStarted * 0.10));

        // Cap at 10 years: after 10 years, malus becomes 0
        if (yearsStarted >= 10) {
          decoteFactor = 0;
          debug.notes.push(`Vehicle is ${yearsStarted} years old (>= 10 years). Décote reduces malus to 0.`);
        } else if (yearsStarted > 0) {
          debug.notes.push(`Vehicle is ${yearsStarted} year(s) old. Décote factor: ${decoteFactor.toFixed(2)} (${(1 - decoteFactor) * 100}% reduction)`);
        } else {
          debug.notes.push('Vehicle is new or less than 1 year old. No décote applied.');
        }
      }
    } catch (error) {
      debug.notes.push(`Error calculating décote: ${error.message}. Décote not applied.`);
      logger.warn('Error calculating décote', { error: error.message, first_registration_date, regDate });
    }
  } else {
    debug.notes.push('No first registration date provided. Décote not applied.');
  }

  debug.decote_factor = decoteFactor;

  // Calculate final CO2 malus after décote
  const malusCo2Eur = Math.round(baseMalusCo2 * decoteFactor);

  // E) Optional weight malus
  const weightMalusResult = computeWeightMalus(mass_kg, regDate, enable_weight_malus);
  const malusMasseEur = weightMalusResult.malus_eur;
  debug.notes.push(...weightMalusResult.notes);

  // Calculate total malus
  const totalMalusEur = malusCo2Eur + malusMasseEur;

  // Log calculation for debugging
  logger.debug('French malus calculation completed', {
    co2_g_km_wltp,
    vehicle_category,
    is_first_registration_in_france,
    table_version: tableVersion.id,
    base_malus_co2,
    years_started: yearsStarted,
    decote_factor: decoteFactor,
    malus_co2_eur: malusCo2Eur,
    malus_masse_eur: malusMasseEur,
    total_malus_eur: totalMalusEur
  });

  return {
    malus_co2_eur: malusCo2Eur,
    malus_masse_eur: malusMasseEur,
    total_malus_eur: totalMalusEur,
    debug
  };
}
