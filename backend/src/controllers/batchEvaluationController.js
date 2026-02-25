import { parseAuctionUrl } from '../services/auctionUrlParserService.js';
import { calculateMarginForAuction } from '../services/marginCalculationService.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v1/evaluations/batch
 * Process multiple URLs in batch and create evaluations
 */
export async function batchCreateEvaluations(req, res, next) {
  const correlationId = uuidv4();
  
  try {
    const { urls, options = {} } = req.body;
    const userId = req.user.id;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: 'URLs array is required and must not be empty',
        code: 'MISSING_URLS'
      });
    }

    if (urls.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 URLs allowed per batch',
        code: 'TOO_MANY_URLS'
      });
    }

    logger.info('Batch evaluation request', {
      correlationId,
      urlCount: urls.length,
      userId
    });

    // Process URLs in parallel (with concurrency limit)
    const concurrency = options.concurrency || 3; // Process 3 at a time
    const results = [];
    const errors = [];

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(async (url, index) => {
        const urlIndex = i + index;
        try {
          // Parse URL
          const auctionData = await parseAuctionUrl(url);
          
          // Calculate margin
          const marginResult = await calculateMarginForAuction(auctionData, {
            userId,
            saveToDatabase: true,
            ...options
          });

          if (!marginResult || !marginResult.auction_listing_id) {
            throw new Error('Failed to create evaluation');
          }

          // Get the created evaluation (most recent for this auction listing and user)
          const { data: evaluation, error: evalError } = await supabase
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
            .eq('auction_listing_id', marginResult.auction_listing_id)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (evalError) {
            throw new Error(`Failed to retrieve evaluation: ${evalError.message}`);
          }

          return {
            url,
            urlIndex,
            status: 'success',
            evaluation: {
              id: evaluation.id,
              name: evaluation.name,
              brand: evaluation.auction_listings?.brand,
              model: evaluation.auction_listings?.model,
              year: evaluation.auction_listings?.year,
              margin_mid: evaluation.margin_mid,
              price_estimate_mid: evaluation.price_estimate_mid,
              created_at: evaluation.created_at
            }
          };
        } catch (error) {
          logger.error('Error processing URL in batch', {
            correlationId,
            url,
            urlIndex,
            error: error.message
          });
          return {
            url,
            urlIndex,
            status: 'error',
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Separate successes and errors
    const successes = results.filter(r => r.status === 'success');
    const failures = results.filter(r => r.status === 'error');

    logger.info('Batch evaluation completed', {
      correlationId,
      total: urls.length,
      success: successes.length,
      errors: failures.length
    });

    res.json({
      success: true,
      correlation_id: correlationId,
      total: urls.length,
      success_count: successes.length,
      error_count: failures.length,
      results: results.sort((a, b) => a.urlIndex - b.urlIndex) // Sort by original order
    });
  } catch (error) {
    logger.error('Error in batch evaluation', {
      error: error.message,
      stack: error.stack,
      correlationId
    });
    next(error);
  }
}

/**
 * POST /api/v1/evaluations/batch-status
 * Get status of batch processing (for polling)
 */
export async function getBatchStatus(req, res, next) {
  try {
    const { correlation_id } = req.query;
    
    if (!correlation_id) {
      return res.status(400).json({
        error: 'correlation_id is required',
        code: 'MISSING_CORRELATION_ID'
      });
    }

    // In a real implementation, you'd store batch status in Redis or database
    // For now, we'll return a simple response
    res.json({
      success: true,
      correlation_id,
      status: 'completed' // This would be dynamic in a real implementation
    });
  } catch (error) {
    logger.error('Error getting batch status', {
      error: error.message
    });
    next(error);
  }
}
