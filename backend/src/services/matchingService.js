import { logger } from '../utils/logger.js';

/**
 * Normalize string: lowercase, remove accents, remove punctuation
 */
export function normalizeString(str) {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
}

/**
 * Tokenize string into array of words
 * Handles special cases like "Q4 E" -> ["q4", "e"] and "Q4 e-tron" -> ["q4", "etron"]
 */
export function tokenize(str) {
  if (!str || typeof str !== 'string') return [];
  
  const normalized = normalizeString(str);
  // Split on spaces and hyphens, but keep meaningful tokens
  // "q4 e-tron" -> ["q4", "e", "tron"] -> combine "e" + "tron" -> ["q4", "etron"]
  const tokens = normalized.split(/[\s\-]+/).filter(token => token.length > 0);
  
  // Combine single letters with following tokens (e.g., "e" + "tron" -> "etron")
  const combinedTokens = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].length === 1 && i + 1 < tokens.length) {
      // Single letter followed by another token - combine them
      combinedTokens.push(tokens[i] + tokens[i + 1]);
      i++; // Skip next token as we combined it
    } else {
      combinedTokens.push(tokens[i]);
    }
  }
  
  return combinedTokens;
}

/**
 * Calculate match score between auction listing and comparable listing
 * Returns score between 0 and 1
 * 
 * Scoring weights:
 * - Brand+model tokens: 40%
 * - Fuel+gearbox exact match: 30%
 * - Year difference penalty: -0.05 per year
 * - Mileage difference penalty: -0.0001 per km difference (normalized)
 * - Trim keywords overlap: 20%
 * - Power difference: 10% (if both present)
 */
export function calculateMatchScore(auctionListing, comparable) {
  let score = 0;
  
  // Brand + model tokens (40% weight)
  const auctionBrandTokens = new Set(tokenize(auctionListing.brand || ''));
  const auctionModelTokens = new Set(tokenize(auctionListing.model || ''));
  const comparableTitleTokens = new Set(tokenize(comparable.title || ''));
  const titleNormalized = normalizeString(comparable.title || '');
  
  let brandMatch = 0;
  let modelMatch = 0;
  
  // Brand matching - allow tokens of length 2 or more (e.g., "bmw", "audi")
  auctionBrandTokens.forEach(token => {
    if (comparableTitleTokens.has(token) && token.length >= 2) {
      brandMatch = 1;
    }
  });
  
  // Model matching - improved logic for better matching
  // First, try exact token matches
  auctionModelTokens.forEach(token => {
    if (comparableTitleTokens.has(token)) {
      if (token.length >= 2) {
        modelMatch = Math.max(modelMatch, 1); // Strong match for longer tokens
      } else if (token.length === 1) {
        // Single letter match (e.g., "e" in "Q4 E")
        modelMatch = Math.max(modelMatch, 0.7); // Better score for single letters
      }
    }
  });
  
  // Check for partial model matches in the full title (e.g., "Q4 E" should match "Q4 e-tron")
  if (modelMatch < 1 && auctionModelTokens.size > 0) {
    const modelString = Array.from(auctionModelTokens).join(' ');
    // Check if all model tokens appear in the title (in any order)
    const allTokensFound = Array.from(auctionModelTokens).every(token => titleNormalized.includes(token));
    
    if (allTokensFound) {
      // All tokens found - good match
      modelMatch = Math.max(modelMatch, 0.9);
    } else if (titleNormalized.includes(modelString)) {
      // Model string found as substring
      modelMatch = Math.max(modelMatch, 0.85);
    } else {
      // Check for common model variations (e.g., "Q4 E" vs "Q4 e-tron", "Q4 etron")
      const modelVariations = [
        modelString.replace(/\s+/g, ''), // Remove spaces: "Q4 E" -> "Q4E"
        modelString.replace(/\s+/g, '-'), // Replace spaces with hyphens: "Q4 E" -> "Q4-E"
        ...Array.from(auctionModelTokens).map(t => t.length >= 2 ? t : null).filter(Boolean) // Longer tokens only
      ];
      
      for (const variation of modelVariations) {
        if (variation && titleNormalized.includes(variation)) {
          modelMatch = Math.max(modelMatch, 0.8);
          break;
        }
      }
    }
  }
  
  // Special handling for electric vehicles: "E" or "e" should match "e-tron", "etron", "electric", etc.
  if (modelMatch < 0.8 && auctionModelTokens.has('e') && titleNormalized.match(/\betron|\belectric|\be\s/)) {
    modelMatch = Math.max(modelMatch, 0.75);
  }
  
  const brandModelScore = (brandMatch + modelMatch) / 2;
  score += brandModelScore * 0.4;
  
  // Fuel + gearbox exact match (30% weight)
  const fuelMatch = normalizeString(auctionListing.fuel_type || '') === normalizeString(comparable.fuel_type || '');
  const transmissionMatch = normalizeString(auctionListing.transmission || '') === normalizeString(comparable.transmission || '');
  
  if (fuelMatch && transmissionMatch) {
    score += 0.3;
  } else if (fuelMatch || transmissionMatch) {
    score += 0.15;
  }
  
  // Year difference penalty: -0.05 per year difference
  const yearDiff = Math.abs((auctionListing.year || 0) - (comparable.year || 0));
  const yearPenalty = Math.min(yearDiff * 0.05, 0.3); // Cap at 0.3
  score -= yearPenalty;
  
  // Mileage difference penalty: -0.0001 per km difference (normalized)
  const mileageDiff = Math.abs((auctionListing.mileage || 0) - (comparable.mileage_km || 0));
  const avgMileage = ((auctionListing.mileage || 0) + (comparable.mileage_km || 0)) / 2;
  const normalizedMileageDiff = avgMileage > 0 ? mileageDiff / avgMileage : 0;
  const mileagePenalty = Math.min(normalizedMileageDiff * 0.1, 0.2); // Cap at 0.2
  score -= mileagePenalty;
  
  // Trim keywords overlap (20% weight)
  if (auctionListing.trim && comparable.trim_text) {
    const auctionTrimTokens = new Set(tokenize(auctionListing.trim));
    const comparableTrimTokens = new Set(tokenize(comparable.trim_text));
    
    let commonTokens = 0;
    let totalTokens = Math.max(auctionTrimTokens.size, comparableTrimTokens.size);
    
    auctionTrimTokens.forEach(token => {
      if (comparableTrimTokens.has(token) && token.length > 2) {
        commonTokens++;
      }
    });
    
    if (totalTokens > 0) {
      const trimScore = commonTokens / totalTokens;
      score += trimScore * 0.2;
    }
  }
  
  // Power difference (10% weight, if both present)
  if (auctionListing.power_hp && comparable.power_hp) {
    const powerDiff = Math.abs(auctionListing.power_hp - comparable.power_hp);
    const avgPower = (auctionListing.power_hp + comparable.power_hp) / 2;
    const normalizedPowerDiff = avgPower > 0 ? powerDiff / avgPower : 0;
    const powerScore = Math.max(0, 1 - normalizedPowerDiff);
    score += powerScore * 0.1;
  }
  
  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Enhanced match score calculation with stricter criteria
 * - Year: ±2 years max (penalty -0.05 per year)
 * - Mileage: ±20% max (penalty based on percentage difference)
 * - Version exact match: +0.15 boost
 * - Fuel: Must match (score = 0 if different)
 */
export function calculateEnhancedMatchScore(auctionListing, comparable) {
  let score = 0;
  
  // Brand + model tokens (40% weight) - same as before
  const auctionBrandTokens = new Set(tokenize(auctionListing.brand || ''));
  const auctionModelTokens = new Set(tokenize(auctionListing.model || ''));
  const comparableTitleTokens = new Set(tokenize(comparable.title || ''));
  const titleNormalized = normalizeString(comparable.title || '');
  
  let brandMatch = 0;
  let modelMatch = 0;
  
  auctionBrandTokens.forEach(token => {
    if (comparableTitleTokens.has(token) && token.length >= 2) {
      brandMatch = 1;
    }
  });
  
  auctionModelTokens.forEach(token => {
    if (comparableTitleTokens.has(token)) {
      if (token.length >= 2) {
        modelMatch = Math.max(modelMatch, 1);
      } else if (token.length === 1) {
        modelMatch = Math.max(modelMatch, 0.7);
      }
    }
  });
  
  if (modelMatch < 1 && auctionModelTokens.size > 0) {
    const modelString = Array.from(auctionModelTokens).join(' ');
    const allTokensFound = Array.from(auctionModelTokens).every(token => titleNormalized.includes(token));
    if (allTokensFound) {
      modelMatch = Math.max(modelMatch, 0.9);
    } else if (titleNormalized.includes(modelString)) {
      modelMatch = Math.max(modelMatch, 0.85);
    }
  }
  
  const brandModelScore = (brandMatch + modelMatch) / 2;
  score += brandModelScore * 0.4;
  
  // Fuel type: MUST MATCH (strict requirement)
  const fuelMatch = normalizeString(auctionListing.fuel_type || '') === normalizeString(comparable.fuel_type || '');
  if (!fuelMatch && auctionListing.fuel_type && comparable.fuel_type) {
    // If fuel types are specified and don't match, reduce score significantly
    return 0; // Strict: no match if fuel doesn't match
  }
  if (fuelMatch) {
    score += 0.15; // Boost for fuel match
  }
  
  // Transmission match: boost if matches
  const transmissionMatch = normalizeString(auctionListing.transmission || '') === normalizeString(comparable.transmission || '');
  if (transmissionMatch) {
    score += 0.10; // Boost for transmission match
  }
  
  // Year difference: ±2 years max, -0.05 per year
  const yearDiff = Math.abs((auctionListing.year || 0) - (comparable.year || 0));
  if (yearDiff > 2) {
    // If more than 2 years difference, apply heavy penalty
    score -= Math.min((yearDiff - 2) * 0.1, 0.4);
  } else {
    // Within 2 years, small penalty
    score -= yearDiff * 0.05;
  }
  
  // Mileage difference: ±20% max
  const auctionMileage = auctionListing.mileage || 0;
  const comparableMileage = comparable.mileage_km || 0;
  const avgMileage = (auctionMileage + comparableMileage) / 2;
  
  if (avgMileage > 0) {
    const mileageDiffPct = Math.abs(auctionMileage - comparableMileage) / avgMileage;
    if (mileageDiffPct > 0.20) {
      // More than 20% difference, apply penalty
      score -= Math.min((mileageDiffPct - 0.20) * 0.5, 0.3);
    } else {
      // Within 20%, small penalty
      score -= mileageDiffPct * 0.2;
    }
  }
  
  // Version/trim exact match: +0.15 boost
  if (auctionListing.trim && comparable.trim_text) {
    const auctionTrim = normalizeString(auctionListing.trim);
    const comparableTrim = normalizeString(comparable.trim_text);
    if (auctionTrim === comparableTrim) {
      score += 0.15; // Exact version match boost
    } else {
      // Partial match
      const auctionTrimTokens = new Set(tokenize(auctionListing.trim));
      const comparableTrimTokens = new Set(tokenize(comparable.trim_text));
      let commonTokens = 0;
      auctionTrimTokens.forEach(token => {
        if (comparableTrimTokens.has(token) && token.length > 2) {
          commonTokens++;
        }
      });
      if (commonTokens > 0) {
        score += (commonTokens / Math.max(auctionTrimTokens.size, comparableTrimTokens.size)) * 0.10;
      }
    }
  }
  
  // Power difference (if both present)
  if (auctionListing.power_hp && comparable.power_hp) {
    const powerDiff = Math.abs(auctionListing.power_hp - comparable.power_hp);
    const avgPower = (auctionListing.power_hp + comparable.power_hp) / 2;
    const normalizedPowerDiff = avgPower > 0 ? powerDiff / avgPower : 0;
    const powerScore = Math.max(0, 1 - normalizedPowerDiff);
    score += powerScore * 0.10;
  }
  
  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Select top N comparables with minimum score threshold (enhanced version)
 * Returns only comparables with score > 70% (0.70)
 */
export function selectTopComparables(comparables, n = 10, minScore = 0.70) {
  if (!Array.isArray(comparables) || comparables.length === 0) {
    return [];
  }
  
  // Filter by minimum score and sort by score descending
  const filtered = comparables
    .filter(c => (c.match_score || 0) >= minScore)
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  
  return filtered.slice(0, n);
}

/**
 * Filter comparables by confidence level
 */
export function filterByConfidence(comparables, minScore = 0.70) {
  return comparables.filter(c => (c.match_score || 0) >= minScore);
}

/**
 * Get confidence level based on number of comparables with score > 70%
 */
export function getConfidenceLevel(comparables) {
  if (!Array.isArray(comparables) || comparables.length === 0) {
    return 'low';
  }
  
  const highScoreComparables = comparables.filter(c => (c.match_score || 0) >= 0.70);
  const maxScore = Math.max(...comparables.map(c => c.match_score || 0));
  
  if (highScoreComparables.length >= 8) {
    return 'high';
  } else if (highScoreComparables.length >= 5) {
    return 'medium';
  } else if (maxScore >= 0.70) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Remove outliers by price using IQR (Interquartile Range) method
 * Outliers are values outside Q1 - 1.5*IQR to Q3 + 1.5*IQR
 * Also applies absolute price limits based on vehicle age
 */
export function removeOutliersByPrice(comparables) {
  if (!Array.isArray(comparables) || comparables.length === 0) {
    return comparables;
  }
  
  // First pass: filter by absolute price limits based on vehicle age
  // This prevents obviously incorrect prices from affecting IQR calculation
  const currentYear = new Date().getFullYear();
  const ageFiltered = comparables.filter(c => {
    const price = parseFloat(c.price_eur || 0);
    if (price <= 0 || price > 200000) {
      return false; // Reject prices > 200k (extremely rare for used cars)
    }
    
    // If we have year information, apply age-based limits
    if (c.year) {
      const age = currentYear - c.year;
      if (age > 10 && price > 50000) return false; // Very old cars shouldn't be > 50k
      if (age > 5 && price > 100000) return false; // Cars > 5 years shouldn't be > 100k
      if (age > 2 && price > 150000) return false; // Cars > 2 years shouldn't be > 150k
    }
    
    return true;
  });
  
  // If we filtered out too many, keep original (might be all new cars)
  if (ageFiltered.length < comparables.length * 0.5 && comparables.length >= 4) {
    // Only use age filtering if we still have at least 50% of comparables
    // Otherwise, proceed with IQR on original set
  } else if (ageFiltered.length > 0) {
    // Use age-filtered set for IQR
    comparables = ageFiltered;
  }
  
  // Need at least 4 items for IQR to be meaningful
  if (comparables.length < 4) {
    return comparables;
  }
  
  // Extract prices
  const prices = comparables
    .map(c => parseFloat(c.price_eur || 0))
    .filter(p => p > 0)
    .sort((a, b) => a - b);
  
  if (prices.length < 4) {
    return comparables;
  }
  
  // Calculate quartiles
  const q1Index = Math.floor(prices.length * 0.25);
  const q3Index = Math.floor(prices.length * 0.75);
  const q1 = prices[q1Index];
  const q3 = prices[q3Index];
  const iqr = q3 - q1;
  
  // Calculate bounds with IQR
  const lowerBound = Math.max(0, q1 - 1.5 * iqr);
  const upperBound = q3 + 1.5 * iqr;
  
  // Additional safety: cap upper bound at 200k for used cars
  // (unless we have very new cars, but that's handled by age filter above)
  const maxReasonablePrice = 200000;
  const cappedUpperBound = Math.min(upperBound, maxReasonablePrice);
  
  // Filter comparables within bounds
  const iqrFiltered = comparables.filter(c => {
    const price = parseFloat(c.price_eur || 0);
    return price >= lowerBound && price <= cappedUpperBound;
  });
  
  // If IQR filtering removed too many, be less aggressive
  // But still apply the absolute cap
  // IMPORTANT: If we have fewer than 4 comparables, don't filter aggressively
  // This ensures we keep enough comparables for the calculation
  if (iqrFiltered.length < comparables.length * 0.3 && comparables.length >= 4) {
    // If we filtered out >70%, be less aggressive - just cap at 200k
    const lessAggressiveFiltered = comparables.filter(c => {
      const price = parseFloat(c.price_eur || 0);
      return price > 0 && price <= maxReasonablePrice;
    });
    
    // If we still have fewer than 4 after less aggressive filtering, keep original
    // This is important to ensure we have enough comparables for margin calculation
    if (lessAggressiveFiltered.length < 4 && comparables.length >= 4) {
      logger.warn('Less aggressive filtering still removed too many comparables, keeping original set', {
        originalCount: comparables.length,
        filteredCount: lessAggressiveFiltered.length
      });
      return comparables.filter(c => {
        const price = parseFloat(c.price_eur || 0);
        return price > 0 && price <= maxReasonablePrice;
      });
    }
    
    return lessAggressiveFiltered;
  }
  
  // If we have fewer than 4 comparables after IQR, keep original (don't filter)
  if (iqrFiltered.length < 4 && comparables.length >= 4) {
    logger.warn('IQR filtering left too few comparables, keeping original set', {
      originalCount: comparables.length,
      filteredCount: iqrFiltered.length
    });
    return comparables.filter(c => {
      const price = parseFloat(c.price_eur || 0);
      return price > 0 && price <= maxReasonablePrice;
    });
  }
  
  return iqrFiltered;
}
