import { describe, it, expect } from '@jest/globals';
import {
  normalizeString,
  tokenize,
  calculateMatchScore,
  selectTopComparables,
  removeOutliersByPrice
} from '../src/services/matchingService.js';
import { calculatePriceEstimate } from '../src/services/priceEstimateService.js';
import {
  calculateCosts,
  calculateMargin
} from '../src/services/marginCalculationService.js';

describe('Matching Service', () => {
  describe('normalizeString', () => {
    it('should lowercase and remove accents', () => {
      expect(normalizeString('MÉRcÈdÈs')).toBe('mercedes');
      expect(normalizeString('BMW')).toBe('bmw');
      expect(normalizeString('Audi A4')).toBe('audi a4');
    });

    it('should remove punctuation', () => {
      expect(normalizeString('BMW 3-Series')).toBe('bmw 3series');
      expect(normalizeString('Audi, A4')).toBe('audi a4');
    });

    it('should handle empty or null strings', () => {
      expect(normalizeString('')).toBe('');
      expect(normalizeString(null)).toBe('');
      expect(normalizeString(undefined)).toBe('');
    });
  });

  describe('tokenize', () => {
    it('should split string into tokens', () => {
      expect(tokenize('BMW 3 Series')).toEqual(['bmw', '3', 'series']);
      expect(tokenize('Mercedes-Benz C-Class')).toEqual(['mercedesbenz', 'cclass']);
    });

    it('should filter empty tokens', () => {
      expect(tokenize('  BMW   3  ')).toEqual(['bmw', '3']);
    });
  });

  describe('calculateMatchScore', () => {
    const auctionListing = {
      brand: 'BMW',
      model: '3 Series',
      year: 2020,
      mileage: 50000,
      fuel_type: 'diesel',
      transmission: 'automatic',
      trim: 'M Sport',
      power_hp: 190
    };

    it('should return high score for perfect match', () => {
      const comparable = {
        title: 'BMW 3 Series 2020',
        year: 2020,
        mileage_km: 50000,
        fuel_type: 'diesel',
        transmission: 'automatic',
        trim_text: 'M Sport',
        power_hp: 190,
        price_eur: 30000
      };

      const score = calculateMatchScore(auctionListing, comparable);
      expect(score).toBeGreaterThan(0.7);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should return lower score for year mismatch', () => {
      const comparable = {
        title: 'BMW 3 Series 2018',
        year: 2018,
        mileage_km: 50000,
        fuel_type: 'diesel',
        transmission: 'automatic',
        price_eur: 30000
      };

      const score = calculateMatchScore(auctionListing, comparable);
      expect(score).toBeLessThan(0.8);
    });

    it('should return lower score for fuel type mismatch', () => {
      const comparable = {
        title: 'BMW 3 Series 2020',
        year: 2020,
        mileage_km: 50000,
        fuel_type: 'petrol',
        transmission: 'automatic',
        price_eur: 30000
      };

      const score = calculateMatchScore(auctionListing, comparable);
      expect(score).toBeLessThan(0.7);
    });

    it('should handle missing optional fields', () => {
      const comparable = {
        title: 'BMW 3 Series',
        year: 2020,
        mileage_km: 50000,
        fuel_type: 'diesel',
        transmission: 'automatic',
        price_eur: 30000
      };

      const score = calculateMatchScore(auctionListing, comparable);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('selectTopComparables', () => {
    it('should return top N comparables sorted by score', () => {
      const comparables = [
        { match_score: 0.9, price_eur: 30000 },
        { match_score: 0.6, price_eur: 25000 },
        { match_score: 0.8, price_eur: 28000 },
        { match_score: 0.5, price_eur: 20000 },
        { match_score: 0.7, price_eur: 27000 }
      ];

      const top = selectTopComparables(comparables, 3, 0.55);
      expect(top).toHaveLength(3);
      expect(top[0].match_score).toBe(0.9);
      expect(top[1].match_score).toBe(0.8);
      expect(top[2].match_score).toBe(0.7);
    });

    it('should filter by minimum score', () => {
      const comparables = [
        { match_score: 0.9, price_eur: 30000 },
        { match_score: 0.4, price_eur: 20000 },
        { match_score: 0.6, price_eur: 25000 }
      ];

      const top = selectTopComparables(comparables, 10, 0.55);
      expect(top).toHaveLength(2);
      expect(top.every(c => c.match_score >= 0.55)).toBe(true);
    });

    it('should return empty array for empty input', () => {
      expect(selectTopComparables([])).toEqual([]);
    });
  });

  describe('removeOutliersByPrice', () => {
    it('should remove outliers using IQR method', () => {
      const comparables = [
        { price_eur: 20000 },
        { price_eur: 22000 },
        { price_eur: 25000 },
        { price_eur: 26000 },
        { price_eur: 27000 },
        { price_eur: 28000 },
        { price_eur: 50000 }, // Outlier
        { price_eur: 10000 }  // Outlier
      ];

      const filtered = removeOutliersByPrice(comparables);
      expect(filtered.length).toBeLessThan(comparables.length);
      expect(filtered.every(c => c.price_eur >= 20000 && c.price_eur <= 30000)).toBe(true);
    });

    it('should return all items if less than 4', () => {
      const comparables = [
        { price_eur: 20000 },
        { price_eur: 25000 },
        { price_eur: 30000 }
      ];

      const filtered = removeOutliersByPrice(comparables);
      expect(filtered).toHaveLength(3);
    });

    it('should handle empty array', () => {
      expect(removeOutliersByPrice([])).toEqual([]);
    });
  });
});

describe('Price Estimate Service', () => {
  describe('calculatePriceEstimate', () => {
    it('should calculate percentiles correctly', () => {
      const comparables = [
        { price_eur: 20000, year: 2020, mileage_km: 50000 },
        { price_eur: 22000, year: 2020, mileage_km: 45000 },
        { price_eur: 25000, year: 2021, mileage_km: 40000 },
        { price_eur: 26000, year: 2021, mileage_km: 35000 },
        { price_eur: 27000, year: 2022, mileage_km: 30000 },
        { price_eur: 28000, year: 2022, mileage_km: 25000 },
        { price_eur: 29000, year: 2023, mileage_km: 20000 },
        { price_eur: 30000, year: 2023, mileage_km: 15000 }
      ];

      const auctionListing = {
        year: 2021,
        mileage: 40000
      };

      const estimate = calculatePriceEstimate(comparables, auctionListing);
      
      expect(estimate.low).toBeGreaterThan(0);
      expect(estimate.mid).toBeGreaterThan(estimate.low);
      expect(estimate.high).toBeGreaterThan(estimate.mid);
      expect(estimate.mid).toBeGreaterThanOrEqual(estimate.low);
      expect(estimate.high).toBeGreaterThanOrEqual(estimate.mid);
    });

    it('should return zeros for empty comparables', () => {
      const estimate = calculatePriceEstimate([], { year: 2020, mileage: 50000 });
      expect(estimate.low).toBe(0);
      expect(estimate.mid).toBe(0);
      expect(estimate.high).toBe(0);
    });

    it('should handle single comparable', () => {
      const comparables = [
        { price_eur: 25000, year: 2020, mileage_km: 50000 }
      ];

      const estimate = calculatePriceEstimate(comparables, { year: 2020, mileage: 50000 });
      expect(estimate.mid).toBeGreaterThan(0);
    });
  });
});

describe('Margin Calculation Service', () => {
  describe('calculateCosts', () => {
    it('should calculate total costs correctly', () => {
      const auctionListing = {
        auction_price_sek: 200000,
        auction_fee_eur: 500
      };

      const costs = calculateCosts(auctionListing, {}, 0.085);
      
      expect(costs.auction_price_eur).toBe(200000 * 0.085);
      expect(costs.auction_fee_eur).toBe(500);
      expect(costs.total_eur).toBeGreaterThan(0);
    });

    it('should use default costs when not provided', () => {
      const auctionListing = {
        auction_price_sek: 200000
      };

      const costs = calculateCosts(auctionListing, {}, 0.085);
      
      expect(costs.transport_eur).toBeGreaterThan(0);
      expect(costs.reconditioning_eur).toBeGreaterThan(0);
      expect(costs.tires_eur).toBeGreaterThan(0);
      expect(costs.contingency_eur).toBeGreaterThan(0);
    });

    it('should use custom costs when provided', () => {
      const auctionListing = {
        auction_price_sek: 200000
      };

      const costsConfig = {
        transport_eur: 2000,
        reconditioning_eur: 1000
      };

      const costs = calculateCosts(auctionListing, costsConfig, 0.085);
      
      expect(costs.transport_eur).toBe(2000);
      expect(costs.reconditioning_eur).toBe(1000);
    });
  });

  describe('calculateMargin', () => {
    it('should calculate margin correctly in margin_scheme mode (TTC prices)', () => {
      // Price estimates are TTC (with 20% French VAT on margin only)
      // Formula: Margin HT = (Price TTC - Costs HT) / 1.20
      const priceEstimate = {
        low: 20000,  // TTC
        mid: 25000,  // TTC
        high: 30000  // TTC
      };

      const totalCosts = 18000; // HT

      const margin = calculateMargin(priceEstimate, totalCosts, 'margin_scheme');
      
      // low: (20000 - 18000) / 1.20 = 2000 / 1.20 = 1666.67
      expect(margin.low).toBeCloseTo(1666.67, 2);
      // mid: (25000 - 18000) / 1.20 = 7000 / 1.20 = 5833.33
      expect(margin.mid).toBeCloseTo(5833.33, 2);
      // high: (30000 - 18000) / 1.20 = 12000 / 1.20 = 10000
      expect(margin.high).toBeCloseTo(10000, 2);
    });

    it('should handle negative margins in margin_scheme mode', () => {
      const priceEstimate = {
        low: 15000,  // TTC
        mid: 18000,  // TTC
        high: 20000  // TTC
      };

      const totalCosts = 20000; // HT

      const margin = calculateMargin(priceEstimate, totalCosts, 'margin_scheme');
      
      // low: (15000 - 20000) / 1.20 = -5000 / 1.20 = -4166.67
      expect(margin.low).toBeLessThan(0);
      // mid: (18000 - 20000) / 1.20 = -2000 / 1.20 = -1666.67
      expect(margin.mid).toBeLessThan(0);
      // high: (20000 - 20000) / 1.20 = 0 / 1.20 = 0
      expect(margin.high).toBeCloseTo(0, 2);
    });

    it('should calculate margin correctly in vat_reclaimable mode', () => {
      // In vat_reclaimable mode, convert TTC to HT first, then subtract costs
      const priceEstimate = {
        low: 24000,  // TTC
        mid: 30000,  // TTC
        high: 36000  // TTC
      };

      const totalCosts = 20000; // HT

      const margin = calculateMargin(priceEstimate, totalCosts, 'vat_reclaimable');
      
      // low: (24000 / 1.20) - 20000 = 20000 - 20000 = 0
      expect(margin.low).toBeCloseTo(0, 2);
      // mid: (30000 / 1.20) - 20000 = 25000 - 20000 = 5000
      expect(margin.mid).toBeCloseTo(5000, 2);
      // high: (36000 / 1.20) - 20000 = 30000 - 20000 = 10000
      expect(margin.high).toBeCloseTo(10000, 2);
    });
  });
});
