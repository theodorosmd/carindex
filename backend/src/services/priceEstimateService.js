import { removeOutliersByPrice } from './matchingService.js';
import { logger } from '../utils/logger.js';

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray, p) {
  if (!Array.isArray(sortedArray) || sortedArray.length === 0) {
    return 0;
  }
  
  const index = (sortedArray.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Calculate price estimate from selected comparables
 * Returns {low, mid, high} in EUR
 * 
 * Steps:
 * 1. Remove outliers using IQR
 * 2. Calculate percentiles (25th, 50th, 75th)
 * 3. Apply mileage/year adjustment
 */
export function calculatePriceEstimate(selectedComparables, auctionListing) {
  if (!Array.isArray(selectedComparables) || selectedComparables.length === 0) {
    logger.warn('No comparables provided for price estimate', {
      auctionListingId: auctionListing.id
    });
    return {
      low: 0,
      mid: 0,
      high: 0
    };
  }
  
  // Remove outliers
  const filteredComparables = removeOutliersByPrice(selectedComparables);
  
  if (filteredComparables.length === 0) {
    logger.warn('All comparables filtered out as outliers', {
      originalCount: selectedComparables.length
    });
    return {
      low: 0,
      mid: 0,
      high: 0
    };
  }
  
  // Extract prices and sort
  // Additional safety filter: reject any prices > 200k (extremely rare for used cars)
  const prices = filteredComparables
    .map(c => parseFloat(c.price_eur || 0))
    .filter(p => p > 0 && p <= 200000) // Absolute cap at 200k
    .sort((a, b) => a - b);
  
  if (prices.length === 0) {
    return { low: 0, mid: 0, high: 0 };
  }
  
  // Calculate percentiles
  // If only 1 price, use it for all percentiles but apply a range
  let priceLow, priceMid, priceHigh;
  if (prices.length === 1) {
    const singlePrice = prices[0];
    // Apply ±10% range for single price
    priceLow = singlePrice * 0.90;
    priceMid = singlePrice;
    priceHigh = singlePrice * 1.10;
    logger.warn('Only one comparable found, using ±10% range for price estimate', {
      price: singlePrice,
      low: priceLow,
      mid: priceMid,
      high: priceHigh
    });
  } else if (prices.length === 2) {
    // With 2 prices, use them as low and high, average as mid
    priceLow = prices[0];
    priceMid = (prices[0] + prices[1]) / 2;
    priceHigh = prices[1];
    
    // Ensure minimum spread to avoid identical values after rounding
    const spread = priceHigh - priceLow;
    if (spread < 100) {
      // If prices are too close, create a minimum 2% spread
      const minSpread = priceMid * 0.02;
      priceLow = priceMid - minSpread;
      priceHigh = priceMid + minSpread;
      logger.debug('Applied minimum spread for 2 prices', {
        originalLow: prices[0],
        originalHigh: prices[1],
        adjustedLow: priceLow,
        adjustedMid: priceMid,
        adjustedHigh: priceHigh
      });
    }
  } else if (prices.length === 3) {
    // With 3 prices, use them directly but ensure they're different
    priceLow = prices[0];
    priceMid = prices[1];
    priceHigh = prices[2];
    
    // Ensure minimum spread
    if (priceMid === priceHigh || Math.abs(priceMid - priceHigh) < 50) {
      // If mid and high are too close, adjust high to be at least 1% above mid
      priceHigh = priceMid * 1.01;
      logger.debug('Adjusted high price to ensure minimum spread', {
        originalHigh: prices[2],
        adjustedHigh: priceHigh
      });
    }
    if (priceLow === priceMid || Math.abs(priceLow - priceMid) < 50) {
      // If low and mid are too close, adjust low to be at least 1% below mid
      priceLow = priceMid * 0.99;
      logger.debug('Adjusted low price to ensure minimum spread', {
        originalLow: prices[0],
        adjustedLow: priceLow
      });
    }
  } else {
    // Normal case: use percentiles
    priceLow = percentile(prices, 0.25);
    priceMid = percentile(prices, 0.50); // median
    priceHigh = percentile(prices, 0.75);
    
    // Ensure minimum spread even with percentiles (in case of many identical prices)
    const minSpread = priceMid * 0.01; // 1% minimum spread
    if (priceHigh - priceMid < minSpread) {
      priceHigh = priceMid + minSpread;
    }
    if (priceMid - priceLow < minSpread) {
      priceLow = priceMid - minSpread;
    }
  }
  
  // Calculate median comparable values for display
  const medianComparableYear = percentile(filteredComparables.map(c => c.year || 0).sort((a, b) => a - b), 0.50);
  const medianComparableMileage = percentile(filteredComparables.map(c => c.mileage_km || 0).filter(m => m > 0).sort((a, b) => a - b), 0.50);
  
  // Apply mileage/year adjustment
  const adjustmentResult = calculateMileageYearAdjustment(
    filteredComparables,
    auctionListing
  );
  
  const adjustment = adjustmentResult.adjustment || adjustmentResult;
  const adjustmentDetails = adjustmentResult.details || null;
  
  // Log adjustment for debugging
  logger.debug('Price estimate adjustment', {
    prices: {
      low: priceLow,
      mid: priceMid,
      high: priceHigh
    },
    adjustment,
    auctionListing: {
      year: auctionListing.year,
      mileage: auctionListing.mileage
    },
    medianComparable: {
      year: medianComparableYear,
      mileage: medianComparableMileage
    }
  });
  
  // Cap adjustment to reasonable limits (±20% of median price)
  const maxAdjustment = Math.abs(priceMid * 0.20);
  const cappedAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, adjustment));
  
  if (Math.abs(adjustment) > maxAdjustment) {
    logger.warn('Adjustment capped to prevent unrealistic price estimates', {
      originalAdjustment: adjustment,
      cappedAdjustment,
      maxAdjustment,
      medianPrice: priceMid
    });
  }
  
  priceLow = Math.max(0, priceLow + cappedAdjustment);
  priceMid = Math.max(0, priceMid + cappedAdjustment);
  priceHigh = Math.max(0, priceHigh + cappedAdjustment);
  
  // Final validation: cap all estimates at reasonable maximums based on vehicle age
  // This prevents unrealistic estimates even if comparables have high prices
  const currentYear = new Date().getFullYear();
  const vehicleYear = auctionListing?.year || filteredComparables[0]?.year;
  
  let maxReasonablePrice = 150000; // Default max (more conservative)
  
  if (vehicleYear) {
    const age = currentYear - vehicleYear;
    
    // More conservative limits based on age
    if (age > 10) {
      maxReasonablePrice = 40000; // Very old cars: max 40k (was 50k)
    } else if (age > 7) {
      maxReasonablePrice = 60000; // Old cars (7-10 years): max 60k
    } else if (age > 5) {
      maxReasonablePrice = 80000; // Older cars (5-7 years): max 80k (was 100k)
    } else if (age > 3) {
      maxReasonablePrice = 120000; // Recent cars (3-5 years): max 120k (was 150k)
    } else if (age > 1) {
      maxReasonablePrice = 150000; // Very recent cars (1-3 years): max 150k
    } else {
      maxReasonablePrice = 180000; // Brand new cars (0-1 year): max 180k (was 200k)
    }
    
    logger.debug('Applying price cap based on vehicle age', {
      vehicleYear,
      age,
      maxReasonablePrice,
      currentHigh: priceHigh
    });
  } else {
    // If no year info, apply conservative absolute cap
    maxReasonablePrice = 150000; // More conservative default (was 200k)
    logger.warn('No vehicle year available, applying conservative price cap', {
      maxReasonablePrice,
      currentHigh: priceHigh
    });
  }
  
  // Always cap all estimates at the maximum reasonable price
  if (priceHigh > maxReasonablePrice) {
    logger.warn('Price estimates capped at maximum reasonable price for vehicle age', {
      originalHigh: priceHigh,
      originalMid: priceMid,
      originalLow: priceLow,
      cappedHigh: maxReasonablePrice,
      vehicleYear,
      age: vehicleYear ? currentYear - vehicleYear : 'unknown'
    });
    // Scale down proportionally to maintain spread
    const scaleFactor = maxReasonablePrice / priceHigh;
    priceHigh = maxReasonablePrice;
    priceMid = priceMid * scaleFactor;
    priceLow = priceLow * scaleFactor;
    
    logger.debug('Price estimates scaled down', {
      newHigh: priceHigh,
      newMid: priceMid,
      newLow: priceLow,
      scaleFactor
    });
  }
  
  // Ensure final values are distinct after adjustment and rounding
  // This prevents identical values when there are few comparables
  const roundedLow = Math.round(priceLow);
  const roundedMid = Math.round(priceMid);
  const roundedHigh = Math.round(priceHigh);
  
  // If mid and high are identical, increase high by at least 1% or 50€
  let finalHigh = roundedHigh;
  if (roundedMid === roundedHigh || Math.abs(roundedMid - roundedHigh) < 50) {
    finalHigh = Math.max(roundedHigh, Math.round(roundedMid * 1.01));
    if (finalHigh === roundedMid) {
      finalHigh = roundedMid + 50; // Minimum 50€ difference
    }
    logger.debug('Adjusted final high price to ensure distinct values', {
      originalHigh: roundedHigh,
      adjustedHigh: finalHigh,
      mid: roundedMid
    });
  }
  
  // If low and mid are identical, decrease low by at least 1% or 50€
  let finalLow = roundedLow;
  if (roundedLow === roundedMid || Math.abs(roundedLow - roundedMid) < 50) {
    finalLow = Math.min(roundedLow, Math.round(roundedMid * 0.99));
    if (finalLow === roundedMid) {
      finalLow = Math.max(0, roundedMid - 50); // Minimum 50€ difference
    }
    logger.debug('Adjusted final low price to ensure distinct values', {
      originalLow: roundedLow,
      adjustedLow: finalLow,
      mid: roundedMid
    });
  }
  
  return {
    low: finalLow,
    mid: roundedMid,
    high: finalHigh,
    adjustment: {
      amount: Math.round(cappedAdjustment),
      originalAmount: Math.round(adjustment),
      capped: Math.abs(adjustment) > maxAdjustment,
      details: adjustmentDetails ? {
        yearDiff: adjustmentDetails.yearDiff,
        yearAdjustment: Math.round(adjustmentDetails.yearAdjustment),
        mileageDiff: adjustmentDetails.mileageDiff,
        mileageAdjustment: Math.round(adjustmentDetails.mileageAdjustment),
        medianComparableYear: Math.round(medianComparableYear),
        medianComparableMileage: Math.round(medianComparableMileage),
        auctionYear: auctionListing.year,
        auctionMileage: auctionListing.mileage
      } : null
    },
    pricesBeforeAdjustment: {
      low: Math.round(priceLow - cappedAdjustment),
      mid: Math.round(priceMid - cappedAdjustment),
      high: Math.round(priceHigh - cappedAdjustment)
    }
  };
}

/**
 * Calculate adjustment for mileage and year differences
 * Returns {adjustment: number, details?: object} where adjustment is in EUR (positive = add, negative = subtract)
 */
function calculateMileageYearAdjustment(comparables, auctionListing) {
  if (!Array.isArray(comparables) || comparables.length < 3) {
    // Not enough data for regression, use heuristic
    return calculateHeuristicAdjustment(comparables, auctionListing);
  }
  
  // Try linear regression: price ~ a + b*mileage + c*year
  try {
    const regression = calculateLinearRegression(comparables);
    
    if (regression) {
      const { intercept, mileageCoeff, yearCoeff } = regression;
      
      // Calculate expected price for auction listing
      const expectedPrice = intercept + 
        (mileageCoeff * (auctionListing.mileage || 0)) +
        (yearCoeff * (auctionListing.year || 0));
      
      // Calculate median price from comparables
      const medianPrice = percentile(
        comparables.map(c => parseFloat(c.price_eur || 0)).sort((a, b) => a - b),
        0.50
      );
      
      // Adjustment is the difference
      // For regression, we don't have detailed breakdown, so calculate approximate details
      const medianMileage = percentile(
        comparables.map(c => c.mileage_km || 0).filter(m => m > 0).sort((a, b) => a - b),
        0.50
      );
      const medianYear = percentile(
        comparables.map(c => c.year || 0).sort((a, b) => a - b),
        0.50
      );
      
      const mileageDiff = (auctionListing.mileage || 0) - medianMileage;
      const yearDiff = (auctionListing.year || 0) - medianYear;
      const mileageAdjustment = mileageDiff * mileageCoeff;
      const yearAdjustment = yearDiff * yearCoeff;
      
      return {
        adjustment: expectedPrice - medianPrice,
        details: {
          yearDiff,
          yearAdjustment,
          mileageDiff,
          mileageAdjustment
        }
      };
    }
  } catch (error) {
    logger.warn('Linear regression failed, using heuristic', {
      error: error.message
    });
  }
  
  // Fallback to heuristic
  return calculateHeuristicAdjustment(comparables, auctionListing);
}

/**
 * Simple linear regression: price ~ intercept + mileageCoeff*mileage + yearCoeff*year
 * Uses least squares method
 */
function calculateLinearRegression(comparables) {
  const n = comparables.length;
  if (n < 3) return null;
  
  // Extract data
  const data = comparables.map(c => ({
    price: parseFloat(c.price_eur || 0),
    mileage: c.mileage_km || 0,
    year: c.year || 0
  })).filter(d => d.price > 0);
  
  if (data.length < 3) return null;
  
  // Calculate means
  const meanPrice = data.reduce((sum, d) => sum + d.price, 0) / data.length;
  const meanMileage = data.reduce((sum, d) => sum + d.mileage, 0) / data.length;
  const meanYear = data.reduce((sum, d) => sum + d.year, 0) / data.length;
  
  // Calculate sums for regression
  let sumMileageSq = 0;
  let sumYearSq = 0;
  let sumMileageYear = 0;
  let sumPriceMileage = 0;
  let sumPriceYear = 0;
  
  for (const d of data) {
    const dm = d.mileage - meanMileage;
    const dy = d.year - meanYear;
    const dp = d.price - meanPrice;
    
    sumMileageSq += dm * dm;
    sumYearSq += dy * dy;
    sumMileageYear += dm * dy;
    sumPriceMileage += dp * dm;
    sumPriceYear += dp * dy;
  }
  
  // Solve system of equations for coefficients
  const denominator = sumMileageSq * sumYearSq - sumMileageYear * sumMileageYear;
  
  if (Math.abs(denominator) < 0.0001) {
    return null; // Singular matrix
  }
  
  const mileageCoeff = (sumPriceMileage * sumYearSq - sumPriceYear * sumMileageYear) / denominator;
  const yearCoeff = (sumPriceYear * sumMileageSq - sumPriceMileage * sumMileageYear) / denominator;
  const intercept = meanPrice - mileageCoeff * meanMileage - yearCoeff * meanYear;
  
  return {
    intercept,
    mileageCoeff,
    yearCoeff
  };
}

/**
 * Heuristic adjustment when regression is not possible
 * -0.03 €/km above median mileage
 * +500 €/year above median year
 */
function calculateHeuristicAdjustment(comparables, auctionListing) {
  if (!Array.isArray(comparables) || comparables.length === 0) {
    return { adjustment: 0 };
  }
  
  // Calculate median mileage and year
  const mileages = comparables
    .map(c => c.mileage_km || 0)
    .filter(m => m > 0)
    .sort((a, b) => a - b);
  
  const years = comparables
    .map(c => c.year || 0)
    .filter(y => y > 0)
    .sort((a, b) => a - b);
  
  if (mileages.length === 0 || years.length === 0) {
    return { adjustment: 0 };
  }
  
  const medianMileage = percentile(mileages, 0.50);
  const medianYear = percentile(years, 0.50);
  
  // Calculate adjustments
  const mileageDiff = (auctionListing.mileage || 0) - medianMileage;
  const yearDiff = (auctionListing.year || 0) - medianYear;
  
  const mileageAdjustment = mileageDiff * -0.03; // -0.03 €/km
  const yearAdjustment = yearDiff * 500; // +500 €/year
  
  return {
    adjustment: mileageAdjustment + yearAdjustment,
    details: {
      yearDiff,
      yearAdjustment,
      mileageDiff,
      mileageAdjustment
    }
  };
}
