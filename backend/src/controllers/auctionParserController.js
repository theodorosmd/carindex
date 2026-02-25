import { parseAuctionUrl } from '../services/auctionUrlParserService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v1/auction/parse-url
 * Parse auction URL and extract vehicle data
 */
export async function parseAuctionUrlController(req, res, next) {
  const correlationId = uuidv4();
  
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'URL is required',
        code: 'MISSING_URL'
      });
    }
    
    logger.info('Parsing auction URL request', {
      correlationId,
      url: url.substring(0, 100), // Log first 100 chars only
      userId: req.user?.id
    });
    
    // Parse the URL
    const auctionData = await parseAuctionUrl(url);
    
    logger.info('Successfully parsed auction URL', {
      correlationId,
      source: auctionData.source,
      brand: auctionData.brand,
      model: auctionData.model,
      fuel_type: auctionData.fuel_type,
      transmission: auctionData.transmission,
      year: auctionData.year,
      mileage: auctionData.mileage
    });
    
    res.json({
      success: true,
      correlation_id: correlationId,
      auction_listing: auctionData
    });
  } catch (error) {
    logger.error('Error parsing auction URL', {
      error: error.message,
      stack: error.stack,
      correlationId
    });
    
    res.status(400).json({
      error: error.message || 'Failed to parse auction URL',
      code: 'PARSE_ERROR',
      correlation_id: correlationId
    });
  }
}
