import { calculateMarginForAuction } from '../services/marginCalculationService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v1/margin/calculate
 * Calculate margin for an auction listing
 * 
 * Request body:
 * {
 *   auction_listing_id?: string, // Optional: if provided, fetch from DB
 *   auction_listing?: { // Required if auction_listing_id not provided
 *     source: string,
 *     source_listing_id: string,
 *     brand: string,
 *     model: string,
 *     trim?: string,
 *     year: number,
 *     fuel_type?: string,
 *     transmission?: string,
 *     power_hp?: number,
 *     mileage: number,
 *     body_type?: string,
 *     color?: string,
 *     vin?: string,
 *     auction_price_sek: number,
 *     auction_fee_eur?: number,
 *     url?: string
 *   },
 *   target_departments?: number[], // Default: [13,83,06,84,34,30]
 *   fx_rate?: number, // Default: 0.085
 *   costs?: {
 *     auction_fee_eur?: number,
 *     transport_eur?: number,
 *     registration_eur?: number,
 *     reconditioning_total_eur?: number, // Total reconditioning (includes tires, contingency, etc.)
 *     vat_mode?: "margin_scheme" | "vat_reclaimable" // Auto-detected from auction listing if not provided
 *   }
 * }
 */
export async function calculateMargin(req, res, next) {
  const correlationId = uuidv4();
  
  try {
    const {
      auction_listing_id,
      auction_listing,
      target_departments,
      fx_rate,
      costs
    } = req.body;
    
    logger.info('Margin calculation request', {
      correlationId,
      hasAuctionListingId: !!auction_listing_id,
      hasAuctionListing: !!auction_listing,
      userId: req.user?.id,
      costs_vat_mode: costs?.vat_mode,
      auction_listing_vat_deductible: auction_listing?.vat_deductible
    });
    
    // Validate input
    if (!auction_listing_id && !auction_listing) {
      return res.status(400).json({
        error: 'Either auction_listing_id or auction_listing is required',
        code: 'MISSING_AUCTION_LISTING'
      });
    }
    
    // If auction_listing_id provided, fetch from DB
    let auctionListingData = auction_listing;
    
    if (auction_listing_id) {
      const { supabase } = await import('../config/supabase.js');
      const { data, error } = await supabase
        .from('auction_listings')
        .select('*')
        .eq('id', auction_listing_id)
        .single();
      
      if (error || !data) {
        return res.status(404).json({
          error: 'Auction listing not found',
          code: 'AUCTION_LISTING_NOT_FOUND'
        });
      }
      
      auctionListingData = data;
    }
    
    // Validate required fields
    if (!auctionListingData.brand || !auctionListingData.model || !auctionListingData.year || !auctionListingData.mileage) {
      return res.status(400).json({
        error: 'Missing required fields: brand, model, year, and mileage are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    if (!auctionListingData.auction_price_sek) {
      return res.status(400).json({
        error: 'auction_price_sek is required',
        code: 'MISSING_AUCTION_PRICE'
      });
    }
    
    // Call service
    const result = await calculateMarginForAuction(auctionListingData, {
      targetDepartments: target_departments,
      fxRate: fx_rate,
      costs,
      correlationId,
      userId: req.user?.id, // Pass user ID for saving
      name: req.body.name || null // Pass name if provided
    });
    
    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Margin calculation failed',
        code: result.code || 'CALCULATION_FAILED',
        correlationId: result.correlationId,
        suggestions: result.suggestions,
        searchUrl: result.searchUrl
      });
    }
    
    // Return formatted response
    res.json({
      success: true,
      correlation_id: result.correlationId,
      auction_listing_id: result.auction_listing_id,
      price_estimate: result.price_estimate,
      costs_breakdown: result.costs_breakdown,
      margin: result.margin,
      comparables: result.comparables,
      debug: result.debug
    });
  } catch (error) {
    logger.error('Error in calculateMargin controller', {
      error: error.message,
      stack: error.stack,
      correlationId
    });
    
    // Check if it's a missing table error
    if (error.message && error.message.includes("Could not find the table 'public.auction_listings'")) {
      const err = new Error('Database tables not found. Please run migration 007 to create the required tables.');
      err.statusCode = 500;
      err.code = 'MISSING_TABLES';
      err.details = 'The auction_listings, comparable_listings, and margin_calculations tables need to be created. See backend/MIGRATION_007_INSTRUCTIONS.md for instructions.';
      return next(err);
    }
    
    next(error);
  }
}
