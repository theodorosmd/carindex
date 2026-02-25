import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/v1/evaluations
 * List all evaluations for the current user
 */
export async function listEvaluations(req, res, next) {
  console.log('=== listEvaluations CALLED ===', { userId: req.user?.id, hasUser: !!req.user });
  logger.info('listEvaluations called', { userId: req.user?.id });
  
  try {
    if (!req.user?.id) {
      console.log('=== NO USER ID ===');
      logger.warn('listEvaluations: No user ID in request');
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }
    
    console.log('=== USER ID EXISTS ===', req.user.id);

    let evaluations, error;
    
    try {
      const result = await supabase
        .from('margin_calculations')
        .select(`
          id,
          name,
          created_at,
          updated_at,
          margin_low,
          margin_mid,
          margin_high,
          price_estimate_low,
          price_estimate_mid,
          price_estimate_high,
          auction_listing_id,
          auction_listings (
            brand,
            model,
            year,
            mileage,
            auction_price_sek,
            url
          )
        `)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
      
      evaluations = result.data;
      error = result.error;
      
      console.log('=== SUPABASE QUERY RESULT ===', { 
        hasData: !!evaluations, 
        dataLength: evaluations?.length,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.code
      });
      
      logger.info('Supabase query result', { 
        hasData: !!evaluations, 
        dataLength: evaluations?.length,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.code
      });
      
      // Log error immediately if present
      if (error) {
        logger.error('Supabase returned an error in listEvaluations', {
          error: error.message,
          errorCode: error.code,
          errorDetails: error,
          userId: req.user.id
        });
      }
      
      // Log sample of first evaluation to check structure
      if (evaluations && evaluations.length > 0) {
        logger.debug('Sample evaluation structure', {
          hasAuctionListings: !!evaluations[0].auction_listings,
          auctionListingsType: typeof evaluations[0].auction_listings,
          evaluationKeys: Object.keys(evaluations[0])
        });
      }
    } catch (fetchError) {
      // Handle network/connection errors
      logger.error('Supabase fetch error in listEvaluations', {
        error: fetchError.message,
        stack: fetchError.stack,
        errorName: fetchError.name,
        userId: req.user.id
      });
      
      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch failed')) {
        return res.status(503).json({
          error: 'Database connection failed',
          code: 'DATABASE_CONNECTION_ERROR',
          message: 'Unable to connect to the database. Please check your Supabase configuration and network connection.',
          details: process.env.NODE_ENV === 'development' ? fetchError.message : undefined
        });
      }
      
      throw fetchError; // Re-throw to be caught by outer catch
    }

    if (error) {
      // Check if error is about missing column (migration 008 not run)
      if (error.message && (
        error.message.includes('user_id') || 
        error.message.includes('column') ||
        error.message.includes('does not exist')
      )) {
        logger.warn('user_id column does not exist, migration 008 may not have been run', { 
          error: error.message,
          userId: req.user.id 
        });
        return res.status(500).json({
          error: 'Database migration required',
          code: 'MIGRATION_REQUIRED',
          message: 'The user_id column does not exist in margin_calculations table. Please run migration 008.',
          details: 'See backend/src/database/migrations/008_add_evaluations_management.sql'
        });
      }
      
      // Check if error is about foreign key or relation (auction_listings might not exist)
      if (error.message && (
        error.message.includes('relation') ||
        error.message.includes('foreign key') ||
        error.message.includes('auction_listings')
      )) {
        logger.warn('Error with auction_listings relation, trying without join', {
          error: error.message,
          userId: req.user.id
        });
        
        // Try again without the join
        const { data: evaluationsWithoutJoin, error: errorWithoutJoin } = await supabase
          .from('margin_calculations')
          .select(`
            id,
            name,
            created_at,
            updated_at,
            margin_low,
            margin_mid,
            margin_high,
            price_estimate_low,
            price_estimate_mid,
            price_estimate_high,
            auction_listing_id
          `)
          .eq('user_id', req.user.id)
          .order('created_at', { ascending: false });
        
        if (errorWithoutJoin) {
          logger.error('Error fetching evaluations even without join', { 
            error: errorWithoutJoin.message 
          });
          return res.status(500).json({
            error: 'Failed to fetch evaluations',
            code: 'DATABASE_ERROR',
            details: errorWithoutJoin.message
          });
        }
        
        // Return evaluations without auction_listings data
        return res.json({
          success: true,
          evaluations: (evaluationsWithoutJoin || []).map(evaluation => ({
            ...evaluation,
            auction_listings: null
          }))
        });
      }
      
      logger.error('Error fetching evaluations', { error: error.message, stack: error.stack });
      return res.status(500).json({
        error: 'Failed to fetch evaluations',
        code: 'DATABASE_ERROR',
        details: error.message
      });
    }

    logger.info('Returning evaluations', { count: evaluations?.length || 0 });
    
    // Normalize evaluations data to ensure JSON serialization works
    // Supabase might return auction_listings as array or object depending on relation type
    let normalizedEvaluations = [];
    try {
      if (!Array.isArray(evaluations)) {
        logger.warn('Evaluations is not an array', { type: typeof evaluations, evaluations });
        normalizedEvaluations = [];
      } else {
        normalizedEvaluations = evaluations.map(evaluation => {
          if (!evaluation || typeof evaluation !== 'object') {
            logger.warn('Invalid evaluation object', { evaluation });
            return null;
          }
          
          // Ensure auction_listings is an object or null, never an array
          let auctionListings = null;
          if (evaluation.auction_listings) {
            if (Array.isArray(evaluation.auction_listings)) {
              // If it's an array, take the first element (shouldn't happen for one-to-one, but handle it)
              auctionListings = evaluation.auction_listings[0] || null;
            } else if (typeof evaluation.auction_listings === 'object') {
              auctionListings = evaluation.auction_listings;
            }
          }
          
          return {
            id: evaluation.id,
            name: evaluation.name,
            created_at: evaluation.created_at,
            updated_at: evaluation.updated_at,
            margin_low: evaluation.margin_low,
            margin_mid: evaluation.margin_mid,
            margin_high: evaluation.margin_high,
            price_estimate_low: evaluation.price_estimate_low,
            price_estimate_mid: evaluation.price_estimate_mid,
            price_estimate_high: evaluation.price_estimate_high,
            auction_listing_id: evaluation.auction_listing_id,
            auction_listings: auctionListings
          };
        }).filter(e => e !== null); // Remove null entries
      }
    } catch (normalizeError) {
      logger.error('Error normalizing evaluations', {
        error: normalizeError.message,
        stack: normalizeError.stack
      });
      // Fallback: return evaluations as-is, but ensure it's an array
      normalizedEvaluations = Array.isArray(evaluations) ? evaluations : [];
    }
    
    logger.info('Preparing response', { evaluationCount: normalizedEvaluations.length });
    
    // Check if response was already sent (shouldn't happen, but safety check)
    if (res.headersSent) {
      logger.warn('Response headers already sent, cannot send response');
      return;
    }
    
    // Send response
    try {
      // Test JSON serialization before sending
      const responseData = {
        success: true,
        evaluations: normalizedEvaluations
      };
      
      // Try to serialize to catch any circular references or invalid data
      const testSerialization = JSON.stringify(responseData);
      logger.info('JSON serialization test successful', { 
        evaluationCount: normalizedEvaluations.length,
        jsonLength: testSerialization.length
      });
      
      logger.info('Sending JSON response', { 
        evaluationCount: normalizedEvaluations.length
      });
      
      res.json(responseData);
      
      logger.info('Response sent successfully');
    } catch (sendError) {
      logger.error('Error sending response', {
        error: sendError.message,
        stack: sendError.stack,
        headersSent: res.headersSent,
        errorName: sendError.name
      });
      
      // If headers not sent yet, try to send error response
      if (!res.headersSent) {
        try {
          res.status(500).json({
            error: 'Failed to send response',
            code: 'RESPONSE_ERROR',
            message: sendError.message
          });
        } catch (fallbackError) {
          logger.error('Critical: Cannot send any response', {
            error: fallbackError.message,
            originalError: sendError.message
          });
          // Last resort: send plain text
          if (!res.headersSent) {
            res.status(500).type('text/plain').send('Internal Server Error: Failed to serialize response');
          }
        }
      }
      
      // Don't throw - we've already tried to send an error response
    }
  } catch (error) {
    console.error('=== ERROR IN listEvaluations ===', error);
    logger.error('Error in listEvaluations', { 
      error: error.message, 
      stack: error.stack,
      errorName: error.name,
      errorCode: error.code,
      userId: req.user?.id
    });
    
    // Handle network/connection errors
    if (error.name === 'TypeError' && error.message.includes('fetch failed')) {
      return res.status(503).json({
        error: 'Database connection failed',
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Unable to connect to the database. Please check your Supabase configuration and network connection.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // Ensure we always send a valid JSON response
    try {
      next(error);
    } catch (nextError) {
      // If next() throws, send error response directly
      console.error('=== ERROR IN next() ===', nextError);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  }
}

/**
 * GET /api/v1/evaluations/:id
 * Get a specific evaluation by ID
 */
export async function getEvaluation(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const { id } = req.params;
    
    logger.debug('Getting evaluation', { 
      evaluationId: id, 
      userId: req.user.id,
      idType: typeof id,
      idLength: id?.length 
    });

    // First, get the evaluation with auction_listing
    const { data: evaluation, error } = await supabase
      .from('margin_calculations')
      .select(`
        *,
        auction_listings (*)
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      logger.warn('Error fetching evaluation from database', { 
        error: error.message, 
        errorCode: error.code,
        evaluationId: id,
        userId: req.user.id
      });
      
      // Check if it's a "not found" error from Supabase
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return res.status(404).json({
          error: 'Evaluation not found',
          code: 'EVALUATION_NOT_FOUND',
          message: 'The evaluation does not exist or you do not have access to it'
        });
      }
      
      return res.status(500).json({
        error: 'Database error',
        code: 'DATABASE_ERROR',
        message: error.message
      });
    }

    if (!evaluation) {
      logger.warn('Evaluation not found', { 
        evaluationId: id,
        userId: req.user.id
      });
      return res.status(404).json({
        error: 'Evaluation not found',
        code: 'EVALUATION_NOT_FOUND',
        message: 'The evaluation does not exist or you do not have access to it'
      });
    }

    // Get comparable listings for this auction listing
    let comparableListings = []
    if (evaluation.auction_listing_id) {
      const { data: comparables, error: comparablesError } = await supabase
        .from('comparable_listings')
        .select(`
          id,
          url,
          title,
          price_eur,
          year,
          mileage_km,
          location_department,
          match_score
        `)
        .eq('auction_listing_id', evaluation.auction_listing_id)
        .order('match_score', { ascending: false })
        .limit(20);

      if (comparablesError) {
        logger.warn('Error fetching comparable listings', {
          error: comparablesError.message,
          auctionListingId: evaluation.auction_listing_id
        });
        // Don't fail the request if comparables can't be loaded
        comparableListings = []
      } else {
        // Filter out comparables with score 0 or null - these are likely invalid matches
        // that were saved during a fallback scenario
        comparableListings = (comparables || []).filter(c => 
          c.match_score !== null && 
          c.match_score !== undefined && 
          c.match_score > 0
        );
        
        logger.info('Filtered comparables with zero scores', {
          totalComparables: comparables?.length || 0,
          filteredComparables: comparableListings.length,
          removedCount: (comparables?.length || 0) - comparableListings.length
        });
      }
    }

    logger.debug('Evaluation found', { 
      evaluationId: evaluation.id,
      userId: req.user.id,
      comparablesCount: comparableListings.length
    });

    // Add comparable listings to evaluation object
    evaluation.comparable_listings = comparableListings

    res.json({
      success: true,
      evaluation
    });
  } catch (error) {
    logger.error('Error in getEvaluation', { 
      error: error.message,
      stack: error.stack,
      evaluationId: req.params?.id,
      userId: req.user?.id
    });
    next(error);
  }
}

/**
 * PUT /api/v1/evaluations/:id
 * Update an evaluation (name, notes)
 */
export async function updateEvaluation(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const { id } = req.params;
    const { name, notes } = req.body;

    // First check if evaluation exists and belongs to user
    const { data: existing } = await supabase
      .from('margin_calculations')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({
        error: 'Evaluation not found',
        code: 'EVALUATION_NOT_FOUND'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) {
      updateData.name = name;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data: evaluation, error } = await supabase
      .from('margin_calculations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating evaluation', { error: error.message });
      return res.status(500).json({
        error: 'Failed to update evaluation',
        code: 'DATABASE_ERROR'
      });
    }

    res.json({
      success: true,
      evaluation
    });
  } catch (error) {
    logger.error('Error in updateEvaluation', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /api/v1/evaluations/:id
 * Delete an evaluation
 */
export async function deleteEvaluation(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const { id } = req.params;

    // Check if evaluation exists and belongs to user
    const { data: existing } = await supabase
      .from('margin_calculations')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({
        error: 'Evaluation not found',
        code: 'EVALUATION_NOT_FOUND'
      });
    }

    const { error } = await supabase
      .from('margin_calculations')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      logger.error('Error deleting evaluation', { error: error.message });
      return res.status(500).json({
        error: 'Failed to delete evaluation',
        code: 'DATABASE_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'Evaluation deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteEvaluation', { error: error.message });
    next(error);
  }
}

/**
 * POST /api/v1/evaluations/:id/recalculate
 * Recalculate an evaluation with updated validation rules
 */
export async function recalculateEvaluation(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const { id } = req.params;

    // Get the evaluation with auction listing
    const { data: evaluation, error: fetchError } = await supabase
      .from('margin_calculations')
      .select(`
        *,
        auction_listings (*)
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !evaluation) {
      return res.status(404).json({
        error: 'Evaluation not found',
        code: 'EVALUATION_NOT_FOUND'
      });
    }

    if (!evaluation.auction_listings) {
      return res.status(400).json({
        error: 'Auction listing not found for this evaluation',
        code: 'AUCTION_LISTING_NOT_FOUND'
      });
    }

    const auctionListing = evaluation.auction_listings;
    const costsBreakdown = evaluation.costs_breakdown_json || {};

    // Validate that auction listing has required data
    // Try to get price from costs_breakdown_json if missing from auction listing
    let auctionPriceSek = auctionListing.auction_price_sek;
    if (!auctionPriceSek || auctionPriceSek === 0) {
      // Try to get from costs breakdown (might have been stored there)
      if (costsBreakdown.auction_price_sek) {
        auctionPriceSek = costsBreakdown.auction_price_sek;
        logger.warn('Using auction price from costs breakdown', {
          evaluationId: id,
          price: auctionPriceSek
        });
      } else if (costsBreakdown.auction_price_eur && evaluation.fx_rate) {
        // Try to reverse calculate from EUR price
        auctionPriceSek = costsBreakdown.auction_price_eur / evaluation.fx_rate;
        logger.warn('Reverse calculating auction price from EUR', {
          evaluationId: id,
          price_eur: costsBreakdown.auction_price_eur,
          fx_rate: evaluation.fx_rate,
          calculated_price_sek: auctionPriceSek
        });
      }
    }
    
    if (!auctionPriceSek || auctionPriceSek === 0) {
      logger.error('Auction listing missing price data', {
        evaluationId: id,
        auctionListingId: auctionListing.id,
        auction_price_sek: auctionListing.auction_price_sek,
        costs_breakdown_has_price: !!costsBreakdown.auction_price_sek
      });
      return res.status(400).json({
        error: 'Auction listing is missing price information. Cannot recalculate without auction price. Please create a new evaluation with the auction URL.',
        code: 'MISSING_AUCTION_PRICE',
        details: {
          auction_listing_id: auctionListing.id,
          has_price_in_listing: !!auctionListing.auction_price_sek,
          has_price_in_costs: !!costsBreakdown.auction_price_sek
        }
      });
    }
    
    // Update auction listing with the price we found
    auctionListing.auction_price_sek = auctionPriceSek;

    // Log the auction listing data for debugging
    logger.info('Recalculating evaluation with auction listing data', {
      evaluationId: id,
      auctionListingId: auctionListing.id,
      brand: auctionListing.brand,
      model: auctionListing.model,
      year: auctionListing.year,
      auction_price_sek: auctionListing.auction_price_sek,
      has_costs_breakdown: !!costsBreakdown
    });

    // Import the calculation service
    const { calculateMarginForAuction } = await import('../services/marginCalculationService.js');

    // If we have the URL, try to re-parse it to get fresh data (especially mileage)
    let auctionListingData = { ...auctionListing };
    
    if (auctionListing.url) {
      try {
        logger.info('Re-parsing auction URL to get fresh data', { 
          url: auctionListing.url,
          currentMileage: auctionListing.mileage 
        });
        const { parseAuctionUrl } = await import('../services/auctionUrlParserService.js');
        const freshData = await parseAuctionUrl(auctionListing.url);
        
        // Update with ALL fresh data from re-parsing
        logger.info('Fresh data extracted from URL', {
          mileage: freshData.mileage,
          mileageType: typeof freshData.mileage,
          year: freshData.year,
          price: freshData.auction_price_sek,
          brand: freshData.brand,
          model: freshData.model,
          url: auctionListing.url
        });
        
        // Log if mileage extraction seems wrong
        if (freshData.mileage && (freshData.mileage < 1000 || freshData.mileage > 1000000)) {
          logger.warn('Suspicious mileage value extracted', {
            mileage: freshData.mileage,
            url: auctionListing.url
          });
        }
        
        logger.info('Updating auction listing with fresh parsed data', {
          oldMileage: auctionListing.mileage,
          newMileage: freshData.mileage,
          oldPrice: auctionListing.auction_price_sek,
          newPrice: freshData.auction_price_sek,
          oldYear: auctionListing.year,
          newYear: freshData.year,
          mileageChanged: auctionListing.mileage !== freshData.mileage
        });
        
        // Update all fields from fresh data
        auctionListingData = {
          ...auctionListingData,
          ...freshData, // Override with all fresh data
          id: auctionListing.id, // Keep the same ID
          source: auctionListing.source, // Keep the same source
          source_listing_id: auctionListing.source_listing_id // Keep the same source_listing_id
        };
        
        // Always use fresh mileage if available (even if same value, to ensure it's correct)
        if (freshData.mileage !== undefined && freshData.mileage !== null) {
          logger.info('Mileage from fresh data', {
            oldMileage: auctionListing.mileage,
            newMileage: freshData.mileage,
            willUpdate: freshData.mileage !== auctionListing.mileage
          });
          auctionListingData.mileage = freshData.mileage;
        } else {
          logger.warn('No mileage in fresh data, keeping existing', {
            existingMileage: auctionListing.mileage
          });
        }
      } catch (parseError) {
        logger.error('Failed to re-parse URL, using existing data', {
          error: parseError.message,
          stack: parseError.stack,
          url: auctionListing.url
        });
        // Continue with existing data
      }
    } else {
      logger.warn('No URL available for re-parsing', {
        auctionListingId: auctionListing.id
      });
    }
    
    // Ensure all required fields are present
    // Priority: freshData > auctionListingData > existing auctionListing
    auctionListingData = {
      ...auctionListingData,
      // Ensure price is set (use fresh or fallback to existing)
      auction_price_sek: auctionListingData.auction_price_sek || costsBreakdown.auction_price_sek || auctionPriceSek,
      // Ensure other required fields - use fresh data if available, otherwise existing
      brand: auctionListingData.brand || auctionListing.brand,
      model: auctionListingData.model || auctionListing.model,
      year: auctionListingData.year || auctionListing.year,
      // Mileage: always use fresh data if it was extracted, otherwise keep existing
      mileage: auctionListingData.mileage !== undefined ? auctionListingData.mileage : auctionListing.mileage
    };
    
    logger.info('Final auction listing data before calculation', {
      mileage: auctionListingData.mileage,
      year: auctionListingData.year,
      price: auctionListingData.auction_price_sek,
      brand: auctionListingData.brand,
      model: auctionListingData.model
    });

    const result = await calculateMarginForAuction(auctionListingData, {
      targetDepartments: evaluation.target_departments || [13, 75, 92, 93, 94],
      fxRate: evaluation.fx_rate || 0.092,
      costs: {
        transport_eur: costsBreakdown.transport_eur,
        registration_eur: costsBreakdown.registration_eur,
        reconditioning_total_eur: costsBreakdown.reconditioning_total_eur,
        vat_mode: costsBreakdown.vat_mode,
        registration_in_france_date: costsBreakdown.registration_in_france_date,
        enable_weight_malus: costsBreakdown.enable_weight_malus
      },
      userId: req.user.id,
      name: evaluation.name, // Keep the same name
      updateExisting: true, // Update the existing evaluation instead of creating a new one
      existingEvaluationId: id,
      forceUpdateAuctionListing: true // Force update of auction listing with fresh data (especially mileage)
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to recalculate evaluation',
        code: 'RECALCULATION_FAILED'
      });
    }

    // Get the updated evaluation with auction listing (to show updated mileage)
    const { data: updatedEvaluation, error: updateError } = await supabase
      .from('margin_calculations')
      .select(`
        id,
        name,
        created_at,
        updated_at,
        margin_low,
        margin_mid,
        margin_high,
        price_estimate_low,
        price_estimate_mid,
        price_estimate_high,
        auction_listing_id,
        auction_listings (
          id,
          brand,
          model,
          year,
          mileage,
          url
        )
      `)
      .eq('id', id)
      .single();
    
    // Log the mileage in the response for debugging
    if (updatedEvaluation && updatedEvaluation.auction_listings) {
      logger.info('Updated evaluation retrieved after recalculate', {
        evaluationId: id,
        mileage: updatedEvaluation.auction_listings.mileage,
        url: updatedEvaluation.auction_listings.url
      });
    }

    if (updateError) {
      logger.error('Error fetching updated evaluation', { error: updateError.message });
    }

    res.json({
      success: true,
      message: 'Evaluation recalculated successfully with updated validation rules',
      evaluation: updatedEvaluation || evaluation
    });
  } catch (error) {
    logger.error('Error in recalculateEvaluation', { error: error.message });
    next(error);
  }
}

/**
 * POST /api/v1/evaluations/compare
 * Compare multiple evaluations side by side
 * Body: { evaluation_ids: [id1, id2, ...] }
 */
export async function compareEvaluations(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const { evaluation_ids } = req.body;

    if (!Array.isArray(evaluation_ids) || evaluation_ids.length < 2) {
      return res.status(400).json({
        error: 'At least 2 evaluation IDs are required for comparison',
        code: 'INVALID_INPUT'
      });
    }

    if (evaluation_ids.length > 5) {
      return res.status(400).json({
        error: 'Maximum 5 evaluations can be compared at once',
        code: 'TOO_MANY_EVALUATIONS'
      });
    }

    const { data: evaluations, error } = await supabase
      .from('margin_calculations')
      .select(`
        id,
        name,
        created_at,
        margin_low,
        margin_mid,
        margin_high,
        price_estimate_low,
        price_estimate_mid,
        price_estimate_high,
        costs_breakdown_json,
        fx_rate,
        target_departments,
        auction_listing_id,
        auction_listings (
          brand,
          model,
          year,
          mileage,
          auction_price_sek,
          fuel_type,
          transmission,
          url
        )
      `)
      .in('id', evaluation_ids)
      .eq('user_id', req.user.id);

    if (error) {
      logger.error('Error fetching evaluations for comparison', { error: error.message });
      return res.status(500).json({
        error: 'Failed to fetch evaluations',
        code: 'DATABASE_ERROR'
      });
    }

    if (evaluations.length !== evaluation_ids.length) {
      return res.status(404).json({
        error: 'Some evaluations were not found or do not belong to you',
        code: 'EVALUATIONS_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      evaluations,
      comparison: {
        count: evaluations.length,
        avg_margin_mid: evaluations.reduce((sum, e) => sum + e.margin_mid, 0) / evaluations.length,
        avg_price_estimate_mid: evaluations.reduce((sum, e) => sum + e.price_estimate_mid, 0) / evaluations.length
      }
    });
  } catch (error) {
    logger.error('Error in compareEvaluations', { error: error.message });
    next(error);
  }
}
