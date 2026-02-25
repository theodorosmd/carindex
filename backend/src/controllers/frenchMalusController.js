/**
 * French Malus Controller
 * 
 * Handles HTTP requests for French ecological malus calculation
 */

import { computeFrenchMalus } from '../services/frenchMalusService.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/v1/france/malus
 * Calculate French ecological malus
 * 
 * Query parameters:
 * - co2: required, number, CO2 emissions in g/km (WLTP)
 * - firstReg: optional, ISO date string (YYYY-MM-DD), first registration date abroad
 * - regInFRDate: optional, ISO date string (YYYY-MM-DD), registration date in France (defaults to today)
 * - firstInFR: required, boolean, true if vehicle has NEVER been registered in France
 * - category: required, string, vehicle category: "VP", "VUL", or "OTHER"
 * - massKg: optional, number, vehicle mass in kg
 * - enableWeightMalus: optional, boolean, whether to calculate weight-based malus (default: false)
 */
export async function getMalus(req, res, next) {
  try {
    const {
      co2,
      firstReg,
      regInFRDate,
      firstInFR,
      category,
      massKg,
      enableWeightMalus
    } = req.query;

    // Validate required parameters
    if (co2 === undefined || co2 === null || co2 === '') {
      return res.status(422).json({
        error: 'Missing required parameter: co2',
        code: 'MISSING_CO2'
      });
    }

    if (firstInFR === undefined || firstInFR === null || firstInFR === '') {
      return res.status(422).json({
        error: 'Missing required parameter: firstInFR',
        code: 'MISSING_FIRST_IN_FR'
      });
    }

    if (category === undefined || category === null || category === '') {
      return res.status(422).json({
        error: 'Missing required parameter: category',
        code: 'MISSING_CATEGORY'
      });
    }

    // Validate category enum
    if (!['VP', 'VUL', 'OTHER'].includes(category)) {
      return res.status(422).json({
        error: 'Invalid category. Must be one of: VP, VUL, OTHER',
        code: 'INVALID_CATEGORY'
      });
    }

    // Parse and validate CO2
    const co2Value = parseFloat(co2);
    if (isNaN(co2Value) || co2Value < 0) {
      return res.status(422).json({
        error: 'co2 must be a non-negative number',
        code: 'INVALID_CO2'
      });
    }

    // Parse and validate firstInFR (boolean)
    let isFirstInFR;
    if (firstInFR === 'true' || firstInFR === true) {
      isFirstInFR = true;
    } else if (firstInFR === 'false' || firstInFR === false) {
      isFirstInFR = false;
    } else {
      return res.status(422).json({
        error: 'firstInFR must be a boolean (true or false)',
        code: 'INVALID_FIRST_IN_FR'
      });
    }

    // Parse optional dates
    let firstRegDate = null;
    if (firstReg) {
      const parsedDate = new Date(firstReg);
      if (isNaN(parsedDate.getTime())) {
        return res.status(422).json({
          error: 'Invalid firstReg date format. Use YYYY-MM-DD',
          code: 'INVALID_FIRST_REG_DATE'
        });
      }
      firstRegDate = firstReg; // Keep as ISO string
    }

    let regInFRDateValue = null;
    if (regInFRDate) {
      const parsedDate = new Date(regInFRDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(422).json({
          error: 'Invalid regInFRDate date format. Use YYYY-MM-DD',
          code: 'INVALID_REG_IN_FR_DATE'
        });
      }
      regInFRDateValue = regInFRDate; // Keep as ISO string
    }

    // Parse optional massKg
    let massKgValue = null;
    if (massKg !== undefined && massKg !== null && massKg !== '') {
      const parsedMass = parseFloat(massKg);
      if (isNaN(parsedMass) || parsedMass < 0) {
        return res.status(422).json({
          error: 'massKg must be a non-negative number',
          code: 'INVALID_MASS_KG'
        });
      }
      massKgValue = parsedMass;
    }

    // Parse optional enableWeightMalus
    const enableWeightMalusValue = enableWeightMalus === 'true' || enableWeightMalus === true;

    // Prepare input for computeFrenchMalus
    const input = {
      co2_g_km_wltp: co2Value,
      first_registration_date: firstRegDate,
      registration_in_france_date: regInFRDateValue,
      is_first_registration_in_france: isFirstInFR,
      vehicle_category: category,
      mass_kg: massKgValue,
      enable_weight_malus: enableWeightMalusValue
    };

    // Compute malus
    const result = computeFrenchMalus(input);

    // Return result
    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Error in getMalus controller', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });

    res.status(500).json({
      error: 'Internal server error while calculating malus',
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
}
