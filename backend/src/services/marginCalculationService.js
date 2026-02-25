import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { fetchComparables, buildSearchQuery } from './leboncoinComparableService.js';
import { calculateMatchScore, selectTopComparables, removeOutliersByPrice } from './matchingService.js';
import { calculatePriceEstimate } from './priceEstimateService.js';
import { computeFrenchMalus } from './frenchMalusService.js';
import { v4 as uuidv4 } from 'uuid';

// Default cost values (can be overridden via config)
const DEFAULT_COSTS = {
  auction_fee_eur: 1000, // Fixed auction fee: always 1000 EUR
  transport_sweden_to_france_eur: parseFloat(process.env.DEFAULT_TRANSPORT_COST_EUR) || 1500,
  registration_france_eur: parseFloat(process.env.DEFAULT_REGISTRATION_EUR) || 500, // Default registration fee: 500 EUR
  reconditioning_total_eur: parseFloat(process.env.DEFAULT_RECONDITIONING_EUR) || 500
};

const DEFAULT_FX_RATE = parseFloat(process.env.DEFAULT_FX_RATE_SEK_EUR) || 0.085;
const DEFAULT_DEPARTMENTS = (process.env.DEFAULT_SOUTH_FRANCE_DEPARTMENTS || '13,83,84')
  .split(',')
  .map(d => parseInt(d.trim()))
  .filter(d => !isNaN(d));

/**
 * Calculate total costs for an auction listing
 * Returns costs breakdown object
 * 
 * VAT Modes:
 * - "margin_scheme": No VAT on purchase, VAT only on margin (simplified)
 * - "vat_reclaimable": VAT on purchase can be reclaimed, treat purchase as TTC
 */
export function calculateCosts(auctionListing, costsConfig = {}, fxRate = DEFAULT_FX_RATE) {
  // Determine VAT mode: prioritize costsConfig.vat_mode, then auctionListing.vat_deductible
  let vatMode = costsConfig.vat_mode;
  if (!vatMode) {
    // If not in costsConfig, check auctionListing.vat_deductible
    if (auctionListing.vat_deductible !== undefined) {
      vatMode = auctionListing.vat_deductible ? 'vat_reclaimable' : 'margin_scheme';
      logger.info('VAT mode determined from auction listing', {
        vat_deductible: auctionListing.vat_deductible,
        vat_mode: vatMode
      });
    } else {
      vatMode = 'margin_scheme'; // Default
    }
  } else {
    logger.info('VAT mode from costs config', { vat_mode: vatMode });
  }
  
  // Use estimated reconditioning from auction listing if available, otherwise use config or default
  const reconditioningTotal = auctionListing.estimated_reconditioning_eur || 
                               costsConfig.reconditioning_total_eur || 
                               DEFAULT_COSTS.reconditioning_total_eur;
  
  // Calculate auction price - if VAT is reclaimable, remove Swedish VAT (25%) from the price
  let auctionPriceSek = parseFloat(auctionListing.auction_price_sek || 0);
  let swedishVatAmount = 0;
  
  logger.info('Calculating costs with VAT mode', {
    vatMode,
    auctionPriceSek,
    vat_deductible: auctionListing.vat_deductible,
    costsConfig_vat_mode: costsConfig.vat_mode
  });
  
  if (vatMode === 'vat_reclaimable' && auctionPriceSek > 0) {
    // Swedish VAT is 25% - if price includes VAT, calculate price without VAT
    // Price TTC = Price HT * 1.25
    // Price HT = Price TTC / 1.25
    const priceWithoutVat = auctionPriceSek / 1.25;
    swedishVatAmount = auctionPriceSek - priceWithoutVat;
    auctionPriceSek = priceWithoutVat; // Use price without VAT for cost calculation
    logger.info('Swedish VAT removed from auction price (reclaimable)', {
      originalPrice: auctionListing.auction_price_sek,
      priceWithoutVat: auctionPriceSek,
      vatAmount: swedishVatAmount,
      vatRate: '25%',
      vatMode
    });
  } else {
    logger.warn('Swedish VAT NOT removed - conditions not met', {
      vatMode,
      auctionPriceSek,
      condition1: vatMode === 'vat_reclaimable',
      condition2: auctionPriceSek > 0
    });
  }
  
  const costs = {
    auction_price_sek: parseFloat(auctionListing.auction_price_sek || 0), // Keep original price for reference (TTC)
    auction_price_sek_net: auctionPriceSek, // Price without VAT (if reclaimable) - HT
    swedish_vat_amount_sek: swedishVatAmount, // VAT amount that can be reclaimed
    swedish_vat_amount_eur: swedishVatAmount * fxRate, // VAT amount in EUR
    auction_fee_eur: DEFAULT_COSTS.auction_fee_eur, // Always 1000 EUR, ignore any extracted or provided value
    transport_eur: costsConfig.transport_eur || DEFAULT_COSTS.transport_sweden_to_france_eur,
    registration_eur: costsConfig.registration_eur || DEFAULT_COSTS.registration_france_eur,
    reconditioning_total_eur: reconditioningTotal,
    vat_mode: vatMode,
    fx_rate: fxRate // Include FX rate for frontend display
  };
  
  // Convert auction price from SEK to EUR (using price without VAT if reclaimable)
  costs.auction_price_eur = auctionPriceSek * fxRate;
  
  // VAT handling
  // Note: In margin_scheme, we don't add VAT to purchase costs
  // In vat_reclaimable mode, Swedish VAT (25%) is removed from the purchase price
  // since it can be reclaimed, reducing the actual cost
  
  // Calculate French ecological malus if vehicle data includes required information
  let malusEur = 0;
  let malusDebug = null;
  
  if (auctionListing.co2_g_km_wltp !== null && 
      auctionListing.co2_g_km_wltp !== undefined && 
      !isNaN(auctionListing.co2_g_km_wltp)) {
    try {
      const malusInput = {
        co2_g_km_wltp: auctionListing.co2_g_km_wltp,
        first_registration_date: auctionListing.first_registration_date || null,
        registration_in_france_date: costsConfig.registration_in_france_date || null, // Optional override
        is_first_registration_in_france: auctionListing.is_first_registration_in_france !== false, // Default to true if not specified
        vehicle_category: auctionListing.vehicle_category || 'VP', // Default to VP if not specified
        mass_kg: auctionListing.mass_kg || null,
        enable_weight_malus: costsConfig.enable_weight_malus || false
      };
      
      const malusResult = computeFrenchMalus(malusInput);
      malusEur = malusResult.total_malus_eur;
      malusDebug = malusResult.debug;
      
      logger.info('French malus calculated', {
        co2_g_km_wltp: auctionListing.co2_g_km_wltp,
        malus_co2_eur: malusResult.malus_co2_eur,
        malus_masse_eur: malusResult.malus_masse_eur,
        total_malus_eur: malusEur,
        table_version: malusDebug.co2_table_version
      });
    } catch (error) {
      logger.warn('Error calculating French malus', {
        error: error.message,
        co2_g_km_wltp: auctionListing.co2_g_km_wltp
      });
      // Continue without malus if calculation fails
    }
  }
  
  costs.malus_eur = malusEur;
  costs.malus_debug = malusDebug;
  
  // Calculate total costs
  costs.total_eur = 
    costs.auction_price_eur +
    costs.auction_fee_eur +
    costs.transport_eur +
    costs.registration_eur +
    costs.reconditioning_total_eur +
    malusEur;
  
  return costs;
}

/**
 * Calculate margin from price estimate and total costs
 * Returns {low, mid, high} margins in EUR
 * 
 * Note: Price estimates from Leboncoin are TTC (with French VAT 20%)
 * In margin scheme: VAT applies only to the margin, not the full price
 * Formula: Price TTC = Costs HT + Margin HT + VAT on margin
 *          Price TTC = Costs HT + Margin HT × 1.20
 *          Margin HT = (Price TTC - Costs HT) / 1.20
 * 
 * Costs are already HT (Swedish VAT removed if reclaimable)
 */
export function calculateMargin(priceEstimate, totalCosts, vatMode = 'margin_scheme') {
  // French VAT rate: 20%
  const FRENCH_VAT_RATE = 0.20;
  
  // In margin scheme: VAT applies only to the margin
  // Price TTC = Costs HT + Margin HT × (1 + VAT rate)
  // Therefore: Margin HT = (Price TTC - Costs HT) / (1 + VAT rate)
  if (vatMode === 'margin_scheme') {
    return {
      low: (priceEstimate.low - totalCosts) / (1 + FRENCH_VAT_RATE),
      mid: (priceEstimate.mid - totalCosts) / (1 + FRENCH_VAT_RATE),
      high: (priceEstimate.high - totalCosts) / (1 + FRENCH_VAT_RATE)
    };
  } else {
    // For vat_reclaimable mode: convert TTC prices to HT first
    // Price HT = Price TTC / 1.20
    const priceEstimateHT = {
      low: priceEstimate.low / (1 + FRENCH_VAT_RATE),
      mid: priceEstimate.mid / (1 + FRENCH_VAT_RATE),
      high: priceEstimate.high / (1 + FRENCH_VAT_RATE)
    };
    
    // Calculate margin: HT selling price - HT costs
    return {
      low: priceEstimateHT.low - totalCosts,
      mid: priceEstimateHT.mid - totalCosts,
      high: priceEstimateHT.high - totalCosts
    };
  }
}

/**
 * Get or create auction listing in database
 */
async function getOrCreateAuctionListing(auctionListingData, options = {}) {
  // Check if exists
  const { data: existing } = await supabase
    .from('auction_listings')
    .select('id, mileage, auction_price_sek')
    .eq('source', auctionListingData.source)
    .eq('source_listing_id', auctionListingData.source_listing_id)
    .single();
  
    if (existing) {
      // If forceUpdate option is set, update the existing listing with fresh data
      if (options.forceUpdate) {
        // Prepare update data - exclude id and timestamps that shouldn't be updated manually
        // Also exclude fields that might not exist in the database schema
        const { id, created_at, ...updateData } = auctionListingData;
        updateData.updated_at = new Date().toISOString();
        
        // Only include malus fields if they are defined (to avoid schema errors)
        if (auctionListingData.co2_g_km_wltp !== undefined) {
          updateData.co2_g_km_wltp = auctionListingData.co2_g_km_wltp;
        }
        if (auctionListingData.mass_kg !== undefined) {
          updateData.mass_kg = auctionListingData.mass_kg;
        }
        if (auctionListingData.first_registration_date !== undefined) {
          updateData.first_registration_date = auctionListingData.first_registration_date;
        }
        if (auctionListingData.vehicle_category !== undefined) {
          updateData.vehicle_category = auctionListingData.vehicle_category;
        }
        if (auctionListingData.is_first_registration_in_france !== undefined) {
          updateData.is_first_registration_in_france = auctionListingData.is_first_registration_in_france;
        }
        
        logger.info('Updating auction listing with fresh data', {
          id: existing.id,
          oldMileage: existing.mileage,
          newMileage: auctionListingData.mileage,
          oldPrice: existing.auction_price_sek,
          newPrice: auctionListingData.auction_price_sek,
          updateFields: Object.keys(updateData)
        });
        
        // Log what we're updating
        logger.info('Updating auction listing fields', {
          id: existing.id,
          mileage: {
            old: existing.mileage,
            new: auctionListingData.mileage,
            willChange: existing.mileage !== auctionListingData.mileage
          },
          price: {
            old: existing.auction_price_sek,
            new: auctionListingData.auction_price_sek,
            willChange: existing.auction_price_sek !== auctionListingData.auction_price_sek
          },
          updateFields: Object.keys(updateData)
        });
        
        const { error: updateError } = await supabase
          .from('auction_listings')
          .update(updateData)
          .eq('id', existing.id);
        
        if (updateError) {
          logger.error('Error updating auction listing', { 
            error: updateError.message,
            errorCode: updateError.code,
            updateData: Object.keys(updateData),
            mileageValue: auctionListingData.mileage
          });
          // Continue with existing ID even if update fails
        } else {
          // Verify the update by fetching the updated record
          const { data: updatedRecord, error: fetchError } = await supabase
            .from('auction_listings')
            .select('mileage, auction_price_sek')
            .eq('id', existing.id)
            .single();
          
          if (fetchError) {
            logger.warn('Could not verify update', { error: fetchError.message });
          } else {
            logger.info('Successfully updated auction listing with fresh data', {
              id: existing.id,
              mileage: {
                old: existing.mileage,
                new: auctionListingData.mileage,
                inDatabase: updatedRecord.mileage,
                matches: updatedRecord.mileage === auctionListingData.mileage
              },
              price: {
                old: existing.auction_price_sek,
                new: auctionListingData.auction_price_sek,
                inDatabase: updatedRecord.auction_price_sek
              }
            });
          }
        }
      }
      return existing.id;
    }
  
  // Create new
  // Filter out undefined values and only include fields that exist in the schema
  const insertData = {
    id: uuidv4(),
    source: auctionListingData.source,
    source_listing_id: auctionListingData.source_listing_id,
    brand: auctionListingData.brand,
    model: auctionListingData.model,
    trim: auctionListingData.trim || null,
    year: auctionListingData.year,
    fuel_type: auctionListingData.fuel_type || null,
    transmission: auctionListingData.transmission || null,
    power_hp: auctionListingData.power_hp || null,
    mileage: auctionListingData.mileage,
    body_type: auctionListingData.body_type || null,
    color: auctionListingData.color || null,
    vin: auctionListingData.vin || null,
    auction_price_sek: auctionListingData.auction_price_sek,
    auction_fee_eur: auctionListingData.auction_fee_eur || 0,
    url: auctionListingData.url || null,
    raw_data: auctionListingData.raw_data || null,
    condition_notes: auctionListingData.condition_notes || null,
    vat_deductible: auctionListingData.vat_deductible !== undefined ? auctionListingData.vat_deductible : false,
    estimated_reconditioning_eur: auctionListingData.estimated_reconditioning_eur || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Add malus fields only if they are defined (to avoid schema errors if columns don't exist yet)
  if (auctionListingData.co2_g_km_wltp !== undefined && auctionListingData.co2_g_km_wltp !== null) {
    insertData.co2_g_km_wltp = auctionListingData.co2_g_km_wltp;
  }
  if (auctionListingData.mass_kg !== undefined && auctionListingData.mass_kg !== null) {
    insertData.mass_kg = auctionListingData.mass_kg;
  }
  if (auctionListingData.first_registration_date !== undefined && auctionListingData.first_registration_date !== null) {
    insertData.first_registration_date = auctionListingData.first_registration_date;
  }
  if (auctionListingData.vehicle_category !== undefined && auctionListingData.vehicle_category !== null) {
    insertData.vehicle_category = auctionListingData.vehicle_category;
  }
  if (auctionListingData.is_first_registration_in_france !== undefined) {
    insertData.is_first_registration_in_france = auctionListingData.is_first_registration_in_france;
  }
  
  const { data: newListing, error } = await supabase
    .from('auction_listings')
    .insert(insertData)
    .select('id')
    .single();
  
  if (error) {
    logger.error('Error creating auction listing', { error: error.message });
    
    // Check if it's a schema cache issue (tables exist but cache not refreshed)
    if (error.message && error.message.includes('Could not find the table') && error.message.includes('schema cache')) {
      logger.warn('Supabase schema cache issue detected. Tables exist but cache needs refresh.', {
        error: error.message
      });
      // Retry after a short delay to allow cache refresh
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { data: retryData, error: retryError } = await supabase
        .from('auction_listings')
        .insert({
          id: uuidv4(),
          ...auctionListingData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (retryError) {
        throw new Error('Database tables may not exist or Supabase cache needs refresh. Please verify tables exist and restart the backend server.');
      }
      
      return retryData.id;
    }
    
    throw error;
  }
  
  return newListing.id;
}

/**
 * Main orchestrator function to calculate margin for an auction listing
 * 
 * Steps:
 * 1. Get or create auction listing
 * 2. Fetch comparables from Leboncoin
 * 3. Calculate match scores
 * 4. Select top comparables
 * 5. Remove outliers
 * 6. Calculate price estimate
 * 7. Calculate costs
 * 8. Calculate margin
 * 9. Save margin calculation
 * 10. Return results
 */
export async function calculateMarginForAuction(auctionListingData, options = {}) {
  const {
    targetDepartments = DEFAULT_DEPARTMENTS,
    fxRate = DEFAULT_FX_RATE,
    costs: costsConfig = {},
    correlationId = uuidv4()
  } = options;
  
  logger.info('Starting margin calculation', {
    correlationId,
    auctionListing: {
      brand: auctionListingData.brand,
      model: auctionListingData.model,
      year: auctionListingData.year
    }
  });
  
  try {
    // 1. Get or create auction listing
    // If forceUpdateAuctionListing option is set, update existing listing with fresh data
    const auctionListingId = await getOrCreateAuctionListing(auctionListingData, {
      forceUpdate: options.forceUpdateAuctionListing || false
    });
    
    // 2. Fetch comparables from Leboncoin
    let rawComparables;
    try {
      rawComparables = await fetchComparables(auctionListingData, {
        targetDepartments,
        maxResults: 100,
        useCache: false, // Disable cache to force fresh search with new URL format (u_car_brand)
        auctionListingId
      });
    } catch (error) {
      throw error;
    }
    
    if (!rawComparables || !Array.isArray(rawComparables) || rawComparables.length === 0) {
      logger.warn('No comparables found from search, trying to use existing comparables from database', {
        correlationId,
        auctionListingId,
        auctionListing: {
          brand: auctionListingData.brand,
          model: auctionListingData.model,
          year: auctionListingData.year
        }
      });
      
      // Try to use existing comparables from database as fallback
      if (auctionListingId) {
        try {
          const { data: existingComparables, error: dbError } = await supabase
            .from('comparable_listings')
            .select('*')
            .eq('auction_listing_id', auctionListingId)
            .order('match_score', { ascending: false })
            .limit(50);
          
          if (!dbError && existingComparables && existingComparables.length > 0) {
            logger.info('Using existing comparables from database as fallback', {
              count: existingComparables.length,
              auctionListingId
            });
            
            // Convert database format to comparable format
            rawComparables = existingComparables.map(c => ({
              id: c.id,
              url: c.url,
              title: c.title,
              price_eur: c.price_eur,
              year: c.year,
              mileage_km: c.mileage_km,
              location_department: c.location_department,
              match_score: c.match_score || 0,
              fuel_type: c.fuel_type,
              transmission: c.transmission
            }));
          } else {
            // No existing comparables either
            logger.warn('No existing comparables found in database either', {
              auctionListingId,
              dbError: dbError?.message
            });
            // Return error but with more helpful information
            // Include the search URL that was used so user can verify it works
            const searchUrl = buildSearchQuery ? buildSearchQuery(auctionListingData, targetDepartments) : 'N/A';
            return {
              success: false,
              error: 'No comparables found. Possible reasons: 1) Leboncoin may be blocking automated requests, 2) The search query may be too specific. Solutions: Try again later, or verify the search URL works in a browser.',
              code: 'NO_COMPARABLES_FOUND',
              correlationId,
              auctionListingId,
              searchUrl,
              suggestions: [
                'Try again in a few minutes (Leboncoin may be rate-limiting)',
                `Verify the search URL works in a browser: ${searchUrl}`,
                'The search may be too specific - try removing some filters',
                'Consider using a manual price estimate if comparables are not critical'
              ]
            };
          }
        } catch (fallbackError) {
          logger.error('Error fetching existing comparables as fallback', {
            error: fallbackError.message,
            auctionListingId
          });
          return {
            success: false,
            error: 'No comparables found and could not retrieve existing comparables from database.',
            code: 'NO_COMPARABLES_FOUND',
            correlationId,
            auctionListingId
          };
        }
      } else {
        // No auction listing ID, cannot use fallback
        // Return error but with more helpful information
        return {
          success: false,
          error: 'No comparables found. Possible reasons: 1) Leboncoin may be blocking automated requests. Solutions: Try again later, or manually enter a price estimate.',
          code: 'NO_COMPARABLES_FOUND',
          correlationId,
          auctionListingId,
          suggestions: [
            'Try again in a few minutes (Leboncoin may be rate-limiting)',
            'Verify the search URL works in a browser',
            'Consider using a manual price estimate if comparables are not critical'
          ]
        };
      }
    }
    
    // 3. Clean titles and calculate match scores
    const comparablesWithScores = rawComparables.map(comparable => {
      // Clean title before matching
      let cleanTitle = comparable.title || '';
      // Remove HTML artifacts and CSS class names
      cleanTitle = cleanTitle.replace(/\.adcard_[a-f0-9]+/gi, '');
      cleanTitle = cleanTitle.replace(/\{[^}]*\}/g, '');
      cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
      
      return {
        ...comparable,
        title: cleanTitle, // Use cleaned title
        match_score: calculateMatchScore(auctionListingData, {
          ...comparable,
          title: cleanTitle
        })
      };
    });
    
    // Log score distribution for debugging
    const scores = comparablesWithScores.map(c => c.match_score || 0).sort((a, b) => b - a);
    logger.info('Match score distribution', {
      correlationId,
      totalComparables: comparablesWithScores.length,
      maxScore: scores[0] || 0,
      minScore: scores[scores.length - 1] || 0,
      medianScore: scores[Math.floor(scores.length / 2)] || 0,
      top5Scores: scores.slice(0, 5),
      auctionListing: {
        brand: auctionListingData.brand,
        model: auctionListingData.model,
        year: auctionListingData.year,
        fuel: auctionListingData.fuel_type
      }
    });
    
    // 4. Select top comparables (top 20 with score >= 0.55, increased from 15 to get more results)
    // If no results with 0.55, try with lower threshold (0.4, then 0.3)
    let minScore = 0.55;
    let topComparables = selectTopComparables(comparablesWithScores, 20, minScore); // Increased from 15 to 20
    
    logger.info('Top comparables after initial selection', {
      correlationId,
      totalComparables: comparablesWithScores.length,
      topComparablesCount: topComparables.length,
      minScore,
      scores: topComparables.map(c => ({ score: c.match_score, title: c.title }))
    });
    
    if (topComparables.length === 0) {
      // Try with lower threshold
      minScore = 0.4;
      topComparables = selectTopComparables(comparablesWithScores, 20, minScore); // Increased from 15 to 20
      logger.info('No comparables with score >= 0.55, trying with 0.4', {
        correlationId,
        found: topComparables.length
      });
    }
    
    if (topComparables.length === 0) {
      // Try with even lower threshold
      minScore = 0.3;
      topComparables = selectTopComparables(comparablesWithScores, 20, minScore); // Increased from 15 to 20
      logger.info('No comparables with score >= 0.4, trying with 0.3', {
        correlationId,
        found: topComparables.length
      });
    }
    
    if (topComparables.length === 0) {
      // Last resort: take top 20 but still filter out very low scores (< 0.1)
      // This prevents completely unrelated vehicles (like Tesla when searching for Audi)
      const filteredByMinScore = comparablesWithScores
        .filter(c => (c.match_score || 0) >= 0.1) // Minimum threshold even for last resort
        .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
        .slice(0, 20); // Increased from 15 to 20
      
      if (filteredByMinScore.length > 0) {
        topComparables = filteredByMinScore;
        logger.warn('No comparables passed score thresholds, using top comparables with score >= 0.1', {
          correlationId,
          totalComparables: comparablesWithScores.length,
          filteredCount: filteredByMinScore.length,
          topScore: topComparables[0]?.match_score || 0
        });
      } else {
        // If even with 0.1 threshold we have nothing, log and use empty array
        logger.warn('No comparables found even with minimum score threshold (0.1)', {
          correlationId,
          totalComparables: comparablesWithScores.length,
          maxScore: Math.max(...comparablesWithScores.map(c => c.match_score || 0))
        });
        topComparables = [];
      }
    }
    
    if (topComparables.length === 0) {
      logger.warn('No comparables available after all attempts', {
        correlationId,
        totalComparables: comparablesWithScores.length
      });
      
      return {
        success: false,
        error: 'No comparables matched minimum score threshold. The search found listings but they did not match closely enough to the auction vehicle.',
        code: 'NO_MATCHING_COMPARABLES',
        correlationId,
        auctionListingId,
        details: {
          totalComparablesFound: comparablesWithScores.length,
          maxScore: scores[0] || 0
        }
      };
    }
    
    // 5. Select top 8 and remove outliers
    const top8 = topComparables.slice(0, 8);
    
    logger.info('Before outlier removal', {
      correlationId,
      top8Count: top8.length,
      top8Prices: top8.map(c => ({ price: c.price_eur, title: c.title }))
    });
    
    const filteredComparables = removeOutliersByPrice(top8);
    
    logger.info('After outlier removal', {
      correlationId,
      filteredCount: filteredComparables.length,
      removedCount: top8.length - filteredComparables.length,
      filteredPrices: filteredComparables.map(c => ({ price: c.price_eur, title: c.title }))
    });
    
    if (filteredComparables.length === 0) {
      logger.warn('All comparables filtered out as outliers', {
        correlationId,
        top8Count: top8.length,
        top8Prices: top8.map(c => c.price_eur)
      });
      
      // Fallback to original top 8 if all filtered out
      // But filter out comparables with score 0 - these are not useful
      const finalComparables = top8.filter(c => (c.match_score || 0) > 0);
      
      if (finalComparables.length === 0) {
        logger.warn('All comparables have score 0, cannot proceed', {
          correlationId,
          top8Count: top8.length
        });
        // Return error instead of proceeding with invalid comparables
        return {
          success: false,
          error: 'No valid comparables found after filtering. All comparables have a match score of 0, indicating they do not match the auction vehicle.',
          code: 'NO_VALID_COMPARABLES',
          correlationId,
          auctionListingId,
          details: {
            totalComparablesFound: comparablesWithScores.length,
            top8Count: top8.length,
            allScoresZero: true
          }
        };
      }
      
      // 6. Calculate price estimate
      const priceEstimate = calculatePriceEstimate(finalComparables, auctionListingData);
      
      // 7. Calculate costs
      const costsBreakdown = calculateCosts(auctionListingData, costsConfig, fxRate);
      
      // 8. Calculate margin
      const margin = calculateMargin(priceEstimate, costsBreakdown.total_eur, costsBreakdown.vat_mode);
      
      // 9. Save margin calculation
      const selectedComparableIds = finalComparables
        .map(c => c.id)
        .filter(id => id); // Filter out undefined IDs (if not saved to DB yet)
      
      const { data: marginCalculation, error: saveError } = await supabase
        .from('margin_calculations')
        .insert({
          id: uuidv4(),
          auction_listing_id: auctionListingId,
          target_departments: targetDepartments,
          selected_comparables: selectedComparableIds,
          price_estimate_low: priceEstimate.low,
          price_estimate_mid: priceEstimate.mid,
          price_estimate_high: priceEstimate.high,
          costs_breakdown_json: costsBreakdown,
          margin_low: margin.low,
          margin_mid: margin.mid,
          margin_high: margin.high,
          fx_rate: fxRate,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (saveError) {
        logger.error('Error saving margin calculation', {
          error: saveError.message,
          correlationId
        });
      }
      
      return {
        success: true,
        correlationId,
        auction_listing_id: auctionListingId,
        price_estimate: priceEstimate,
        costs_breakdown: costsBreakdown,
        margin,
        comparables: finalComparables.map(c => ({
          id: c.id,
          url: c.url,
          title: c.title,
          price: c.price_eur,
          year: c.year,
          mileage: c.mileage_km,
          dept: c.location_department,
          seller_type: c.seller_type,
          match_score: c.match_score
        })),
        debug: {
          query_used: 'leboncoin_search',
          outliers_removed_count: top8.length - finalComparables.length,
          total_comparables_fetched: rawComparables.length,
          comparables_after_matching: topComparables.length
        }
      };
    }
    
    // 6. Calculate price estimate
    const priceEstimate = calculatePriceEstimate(filteredComparables, auctionListingData);
    
    // 7. Calculate costs
    const costsBreakdown = calculateCosts(auctionListingData, costsConfig, fxRate);
    
    // 8. Calculate margin
    const margin = calculateMargin(priceEstimate, costsBreakdown.total_eur, costsBreakdown.vat_mode);
    
    // 9. Save margin calculation
    // First, ensure comparables are saved to DB with match scores
    const comparableIds = [];
    for (const comparable of filteredComparables) {
      try {
        if (comparable.id && typeof comparable.id === 'string' && comparable.id.length > 0) {
          // Already in DB, update match score
          await supabase
            .from('comparable_listings')
            .update({ match_score: comparable.match_score })
            .eq('id', comparable.id);
          comparableIds.push(comparable.id);
        } else {
          // Not in DB yet, insert
          const { data: newComparable, error } = await supabase
            .from('comparable_listings')
            .insert({
              id: uuidv4(),
              ...comparable,
              auction_listing_id: auctionListingId,
              fetched_at: new Date().toISOString()
            })
            .select('id')
            .single();
          
          if (!error && newComparable) {
            comparableIds.push(newComparable.id);
          } else if (error) {
            logger.warn('Error saving comparable to DB', {
              error: error.message,
              comparable: comparable.url
            });
          }
        }
      } catch (err) {
        logger.warn('Error processing comparable', {
          error: err.message,
          comparable: comparable.url
        });
      }
    }
    
    // Build insert/update data - conditionally include user_id and name if migration 008 was run
    const data = {
      auction_listing_id: auctionListingId,
      target_departments: targetDepartments,
      selected_comparables: comparableIds,
      price_estimate_low: priceEstimate.low,
      price_estimate_mid: priceEstimate.mid,
      price_estimate_high: priceEstimate.high,
      costs_breakdown_json: costsBreakdown,
      margin_low: margin.low,
      margin_mid: margin.mid,
      margin_high: margin.high,
      fx_rate: fxRate
    };
    
    // If updating existing evaluation, don't set created_at
    if (!options.existingEvaluationId) {
      data.id = uuidv4();
      data.created_at = new Date().toISOString();
    }
    
    // Add user_id and name if provided (will only work if migration 008 was executed)
    if (options.userId !== undefined) {
      data.user_id = options.userId;
    }
    if (options.name !== undefined) {
      data.name = options.name;
    }
    // Add updated_at if column exists (migration 008)
    data.updated_at = new Date().toISOString();
    
    let marginCalculation;
    let saveError;
    
    // Update existing evaluation or insert new one
    if (options.existingEvaluationId) {
      const { data: updated, error: updateError } = await supabase
        .from('margin_calculations')
        .update(data)
        .eq('id', options.existingEvaluationId)
        .select()
        .single();
      marginCalculation = updated;
      saveError = updateError;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('margin_calculations')
        .insert(data)
        .select()
        .single();
      marginCalculation = inserted;
      saveError = insertError;
    }
    
    if (saveError) {
      logger.error('Error saving margin calculation', {
        error: saveError.message,
        correlationId,
        errorCode: saveError.code
      });
      
      // If error is about missing columns (user_id, name, updated_at), it means migration 008 wasn't run
      // But we don't want to fail the entire calculation - just log a warning
      if (saveError.message && (
        saveError.message.includes('column "user_id"') ||
        saveError.message.includes('column "name"') ||
        saveError.message.includes('column "updated_at"')
      )) {
        logger.warn('Migration 008 may not have been executed. Saving without user_id/name fields.', {
          correlationId,
          error: saveError.message
        });
        // Try again without user_id, name, and updated_at
        const { data: retryData, error: retryError } = await supabase
          .from('margin_calculations')
          .insert({
            id: uuidv4(),
            auction_listing_id: auctionListingId,
            target_departments: targetDepartments,
            selected_comparables: comparableIds,
            price_estimate_low: priceEstimate.low,
            price_estimate_mid: priceEstimate.mid,
            price_estimate_high: priceEstimate.high,
            costs_breakdown_json: costsBreakdown,
            margin_low: margin.low,
            margin_mid: margin.mid,
            margin_high: margin.high,
            fx_rate: fxRate,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (retryError) {
          logger.error('Error saving margin calculation (retry without user fields)', {
            error: retryError.message,
            correlationId
          });
          // Don't throw - calculation succeeded, just saving failed
        }
      } else {
        // Other database errors - log but don't fail the calculation
        logger.error('Database error saving margin calculation', {
          error: saveError.message,
          correlationId
        });
      }
    }
    
    logger.info('Margin calculation completed', {
      correlationId,
      auctionListingId,
      margin_mid: margin.mid
    });
    
    return {
      success: true,
      correlationId,
      auction_listing_id: auctionListingId,
      price_estimate: priceEstimate,
      costs_breakdown: costsBreakdown,
      margin,
      comparables: filteredComparables.map(c => ({
        id: c.id,
        url: c.url,
        title: c.title,
        price: c.price_eur,
        year: c.year,
        mileage: c.mileage_km,
        dept: c.location_department,
        seller_type: c.seller_type,
        match_score: c.match_score
      })),
      debug: {
        query_used: 'leboncoin_search',
        outliers_removed_count: top8.length - filteredComparables.length,
        total_comparables_fetched: rawComparables.length,
        comparables_after_matching: topComparables.length
      }
    };
  } catch (error) {
    logger.error('Error calculating margin', {
      error: error.message,
      stack: error.stack,
      correlationId
    });
    
    throw error;
  }
}
