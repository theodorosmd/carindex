import { describe, it, expect } from '@jest/globals';
import { computeFrenchMalus } from '../src/services/frenchMalusService.js';
import { getTableVersion, getBaseMalus } from '../src/services/frenchMalusCo2Tables.js';
import { computeWeightMalus } from '../src/services/frenchMalusWeightService.js';

describe('French Malus Service', () => {
  describe('getTableVersion', () => {
    it('should return 2024_A table for date in 2024 range', () => {
      const version = getTableVersion('2024-06-15');
      expect(version.id).toBe('2024_A');
      expect(version.threshold).toBe(118);
      expect(version.maxCap).toBe(60000);
    });

    it('should return 2024_A table for date in February 2025', () => {
      const version = getTableVersion('2025-02-15');
      expect(version.id).toBe('2024_A');
    });

    it('should return 2025_B table for date in March 2025', () => {
      const version = getTableVersion('2025-03-10');
      expect(version.id).toBe('2025_B');
      expect(version.threshold).toBe(113);
      expect(version.maxCap).toBe(70000);
    });

    it('should return 2025_B table for date in December 2025', () => {
      const version = getTableVersion('2025-12-31');
      expect(version.id).toBe('2025_B');
    });

    it('should default to most recent table if no date provided', () => {
      const version = getTableVersion(null);
      expect(version.id).toBe('2025_B');
    });
  });

  describe('getBaseMalus', () => {
    it('should return 0 for CO2 below threshold (2024_A)', () => {
      const malus = getBaseMalus('2024_A', 117);
      expect(malus).toBe(0);
    });

    it('should return 0 for CO2 below threshold (2025_B)', () => {
      const malus = getBaseMalus('2025_B', 112);
      expect(malus).toBe(0);
    });

    it('should return exact bracket amount for CO2 at threshold (2024_A)', () => {
      const malus = getBaseMalus('2024_A', 118);
      expect(malus).toBe(50);
    });

    it('should return exact bracket amount for CO2 at threshold (2025_B)', () => {
      const malus = getBaseMalus('2025_B', 113);
      expect(malus).toBe(50);
    });

    it('should return exact bracket amount for CO2 in middle range', () => {
      const malus = getBaseMalus('2024_A', 150);
      expect(malus).toBe(2205);
    });

    it('should return exact bracket amount for CO2 at 192 (2024_A)', () => {
      const malus = getBaseMalus('2024_A', 192);
      expect(malus).toBe(51912);
    });

    it('should return maxCap for CO2 above 192 (2024_A)', () => {
      const malus = getBaseMalus('2024_A', 250);
      expect(malus).toBe(60000);
    });

    it('should return maxCap for CO2 above 192 (2025_B)', () => {
      const malus = getBaseMalus('2025_B', 250);
      expect(malus).toBe(70000);
    });

    it('should return 0 for null CO2', () => {
      const malus = getBaseMalus('2024_A', null);
      expect(malus).toBe(0);
    });
  });

  describe('computeWeightMalus', () => {
    it('should return 0 when weight malus is disabled', () => {
      const result = computeWeightMalus(1800, '2025-01-01', false);
      expect(result.malus_eur).toBe(0);
      expect(result.notes).toContain('Weight malus is disabled');
    });

    it('should return 0 when mass_kg is null', () => {
      const result = computeWeightMalus(null, '2025-01-01', true);
      expect(result.malus_eur).toBe(0);
      expect(result.notes).toContain('mass_kg is missing');
    });

    it('should return 0 with note when enabled but not implemented', () => {
      const result = computeWeightMalus(1800, '2025-01-01', true);
      expect(result.malus_eur).toBe(0);
      expect(result.notes.some(note => note.includes('not yet implemented'))).toBe(true);
    });
  });

  describe('computeFrenchMalus - Eligibility Tests', () => {
    it('should return 0 for non-VP category', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        is_first_registration_in_france: true,
        vehicle_category: 'VUL',
        registration_in_france_date: '2025-01-01'
      });

      expect(result.total_malus_eur).toBe(0);
      expect(result.malus_co2_eur).toBe(0);
      expect(result.debug.notes.some(note => note.includes('not VP'))).toBe(true);
    });

    it('should return 0 when already registered in France', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        is_first_registration_in_france: false,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-01-01'
      });

      expect(result.total_malus_eur).toBe(0);
      expect(result.malus_co2_eur).toBe(0);
      expect(result.debug.notes.some(note => note.includes('already been registered'))).toBe(true);
    });

    it('should return 0 with error flag when CO2 is missing', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: null,
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-01-01'
      });

      expect(result.total_malus_eur).toBe(0);
      expect(result.malus_co2_eur).toBe(0);
      expect(result.error).toBe('MISSING_CO2_DATA');
      expect(result.debug.notes.some(note => note.includes('CO2 emissions') && note.includes('missing'))).toBe(true);
    });
  });

  describe('computeFrenchMalus - Table Selection Tests', () => {
    it('should use 2024_A table for registration date in February 2025', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-02-15'
      });

      expect(result.debug.co2_table_version).toBe('2024_A');
      expect(result.debug.notes.some(note => note.includes('2024_A'))).toBe(true);
    });

    it('should use 2025_B table for registration date in March 2025', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-03-10'
      });

      expect(result.debug.co2_table_version).toBe('2025_B');
      expect(result.debug.notes.some(note => note.includes('2025_B'))).toBe(true);
    });
  });

  describe('computeFrenchMalus - Décote Calculation Tests', () => {
    it('should calculate décote correctly for 6 years old vehicle', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        first_registration_date: '2020-06-15',
        registration_in_france_date: '2025-12-28',
        is_first_registration_in_france: true,
        vehicle_category: 'VP'
      });

      expect(result.debug.years_started).toBe(6);
      expect(result.debug.decote_factor).toBeCloseTo(0.4, 2); // 1 - (6 * 0.10) = 0.4
      
      // Base malus for 150 g/km in 2025_B table is 3119
      // With décote: 3119 * 0.4 = 1247.6, rounded to 1248
      const baseMalus = result.debug.base_malus_co2;
      expect(result.malus_co2_eur).toBe(Math.round(baseMalus * 0.4));
    });

    it('should return 0 malus for vehicle 10 years or older', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        first_registration_date: '2015-01-01',
        registration_in_france_date: '2025-12-28',
        is_first_registration_in_france: true,
        vehicle_category: 'VP'
      });

      expect(result.debug.years_started).toBeGreaterThanOrEqual(10);
      expect(result.malus_co2_eur).toBe(0);
      expect(result.debug.notes.some(note => note.includes('>= 10 years') || note.includes('reduces malus to 0'))).toBe(true);
    });

    it('should not apply décote when first_registration_date is missing', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        first_registration_date: null,
        registration_in_france_date: '2025-12-28',
        is_first_registration_in_france: true,
        vehicle_category: 'VP'
      });

      expect(result.debug.years_started).toBe(0);
      expect(result.debug.decote_factor).toBe(1.0);
      expect(result.debug.notes.some(note => note.includes('No first registration date') || note.includes('Décote not applied'))).toBe(true);
    });

    it('should calculate décote for 1 year old vehicle', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        first_registration_date: '2024-12-01',
        registration_in_france_date: '2025-12-28',
        is_first_registration_in_france: true,
        vehicle_category: 'VP'
      });

      expect(result.debug.years_started).toBe(1);
      expect(result.debug.decote_factor).toBeCloseTo(0.9, 2); // 1 - (1 * 0.10) = 0.9
    });

    it('should handle edge case: same year registration', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        first_registration_date: '2025-06-15',
        registration_in_france_date: '2025-12-28',
        is_first_registration_in_france: true,
        vehicle_category: 'VP'
      });

      // Less than 1 year, so years_started should be 0 or 1 depending on calculation
      // Months diff = 6, so ceil(6/12) = 1
      expect(result.debug.years_started).toBe(1);
    });
  });

  describe('computeFrenchMalus - Base Malus Lookup Tests', () => {
    it('should return 0 for CO2 below threshold', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 110, // Below 2025_B threshold of 113
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-03-10'
      });

      expect(result.malus_co2_eur).toBe(0);
      expect(result.debug.base_malus_co2).toBe(0);
    });

    it('should return exact bracket amount for CO2 in range', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-03-10',
        first_registration_date: null // No décote
      });

      // 150 g/km in 2025_B table = 3119 EUR
      expect(result.debug.base_malus_co2).toBe(3119);
      expect(result.malus_co2_eur).toBe(3119); // No décote
    });

    it('should return maxCap for CO2 above 192', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 250,
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-03-10',
        first_registration_date: null
      });

      expect(result.debug.base_malus_co2).toBe(70000); // Max cap for 2025_B
      expect(result.malus_co2_eur).toBe(70000);
    });
  });

  describe('computeFrenchMalus - Weight Malus Tests', () => {
    it('should return 0 weight malus when disabled', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-01-01',
        mass_kg: 1800,
        enable_weight_malus: false
      });

      expect(result.malus_masse_eur).toBe(0);
    });

    it('should return 0 weight malus when mass_kg is null', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-01-01',
        mass_kg: null,
        enable_weight_malus: true
      });

      expect(result.malus_masse_eur).toBe(0);
      expect(result.debug.notes.some(note => note.includes('mass_kg') || note.includes('Weight malus not calculated'))).toBe(true);
    });
  });

  describe('computeFrenchMalus - Integration Tests', () => {
    it('should calculate complete malus with all inputs', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        first_registration_date: '2020-06-15',
        registration_in_france_date: '2025-12-28',
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        mass_kg: 1800,
        enable_weight_malus: false
      });

      expect(result.malus_co2_eur).toBeGreaterThan(0);
      expect(result.malus_masse_eur).toBe(0);
      expect(result.total_malus_eur).toBe(result.malus_co2_eur + result.malus_masse_eur);
      expect(result.debug.co2_table_version).toBe('2025_B');
      expect(result.debug.years_started).toBe(6);
      expect(result.debug.decote_factor).toBeCloseTo(0.4, 2);
    });

    it('should handle edge case: CO2 exactly at threshold', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 113, // Exactly at 2025_B threshold
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-03-10',
        first_registration_date: null
      });

      expect(result.debug.base_malus_co2).toBe(50); // First bracket
      expect(result.malus_co2_eur).toBe(50);
    });

    it('should handle edge case: CO2 exactly at 192', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 192,
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: '2025-03-10',
        first_registration_date: null
      });

      // 192 g/km in 2025_B table = 67467 EUR (last bracket)
      expect(result.debug.base_malus_co2).toBe(67467);
      expect(result.malus_co2_eur).toBe(67467);
    });

    it('should default registration date to today when not provided', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        is_first_registration_in_france: true,
        vehicle_category: 'VP',
        registration_in_france_date: null
      });

      // Should use default (today), which should select 2025_B table if we're in 2025
      expect(result.debug.co2_table_version).toBeDefined();
      expect(result.malus_co2_eur).toBeGreaterThanOrEqual(0);
    });
  });

  describe('computeFrenchMalus - Debug Output', () => {
    it('should include comprehensive debug information', () => {
      const result = computeFrenchMalus({
        co2_g_km_wltp: 150,
        first_registration_date: '2020-06-15',
        registration_in_france_date: '2025-12-28',
        is_first_registration_in_france: true,
        vehicle_category: 'VP'
      });

      expect(result.debug).toBeDefined();
      expect(result.debug.co2_table_version).toBeDefined();
      expect(result.debug.base_malus_co2).toBeGreaterThanOrEqual(0);
      expect(result.debug.years_started).toBeGreaterThanOrEqual(0);
      expect(result.debug.decote_factor).toBeGreaterThanOrEqual(0);
      expect(result.debug.decote_factor).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.debug.notes)).toBe(true);
      expect(result.debug.notes.length).toBeGreaterThan(0);
    });
  });
});
