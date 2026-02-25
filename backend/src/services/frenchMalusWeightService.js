/**
 * French Weight-Based Malus Service
 * 
 * Optional weight-based malus calculation for vehicles
 * This module is kept separate and pluggable for future rule updates
 */

/**
 * Compute weight-based malus
 * 
 * Currently stubbed to return 0, but structure is ready for future implementation
 * when official weight-based malus rules are defined.
 * 
 * @param {number|null} mass_kg - Vehicle mass in running order (kg)
 * @param {string} registrationDate - ISO date string for registration in France
 * @param {boolean} enableWeightMalus - Whether weight malus is enabled
 * @returns {Object} { malus_eur: number, notes: string[] }
 */
export function computeWeightMalus(mass_kg, registrationDate, enableWeightMalus) {
  const notes = [];

  if (!enableWeightMalus) {
    return {
      malus_eur: 0,
      notes: ['Weight malus is disabled']
    };
  }

  if (mass_kg === null || mass_kg === undefined || isNaN(mass_kg)) {
    return {
      malus_eur: 0,
      notes: ['Weight malus not calculated: mass_kg is missing']
    };
  }

  // TODO: Implement weight-based malus rules when official barème is available
  // For now, return 0 with a note
  return {
    malus_eur: 0,
    notes: ['Weight-based malus rules not yet implemented. Rules will be added when official barème is published.']
  };
}
