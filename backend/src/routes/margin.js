import express from 'express';
import { body, validationResult } from 'express-validator';
import { calculateMargin } from '../controllers/marginController.js';
import { parseAuctionUrlController } from '../controllers/auctionParserController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Validation middleware for calculate endpoint
const calculateValidation = [
  body('auction_listing_id').optional().isUUID().withMessage('auction_listing_id must be a valid UUID'),
  body('auction_listing').optional().isObject().withMessage('auction_listing must be an object'),
  body('auction_listing.source').if(body('auction_listing').exists()).notEmpty().withMessage('auction_listing.source is required'),
  body('auction_listing.brand').if(body('auction_listing').exists()).notEmpty().withMessage('auction_listing.brand is required'),
  body('auction_listing.model').if(body('auction_listing').exists()).notEmpty().withMessage('auction_listing.model is required'),
  body('auction_listing.year').if(body('auction_listing').exists()).isInt({ min: 1990, max: 2100 }).withMessage('auction_listing.year must be a valid year'),
  body('auction_listing.mileage').if(body('auction_listing').exists()).isInt({ min: 0 }).withMessage('auction_listing.mileage must be a non-negative integer'),
  body('auction_listing.auction_price_sek').if(body('auction_listing').exists()).isFloat({ min: 0 }).withMessage('auction_listing.auction_price_sek must be a non-negative number'),
  body('target_departments').optional().isArray().withMessage('target_departments must be an array'),
  body('target_departments.*').optional().isInt().withMessage('Each department must be an integer'),
  body('fx_rate').optional().isFloat({ min: 0 }).withMessage('fx_rate must be a non-negative number'),
  body('costs').optional().isObject().withMessage('costs must be an object'),
  body('costs.reconditioning_total_eur').optional().isFloat({ min: 0 }).withMessage('reconditioning_total_eur must be a non-negative number'),
  body('costs.vat_mode').optional().isIn(['margin_scheme', 'vat_reclaimable']).withMessage('vat_mode must be either "margin_scheme" or "vat_reclaimable"'),
  body('name').optional({ nullable: true, checkFalsy: true }).custom((value) => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null, undefined, or empty string
    }
    if (typeof value !== 'string') {
      throw new Error('name must be a string');
    }
    if (value.length > 255) {
      throw new Error('name must be max 255 characters');
    }
    return true;
  }),
  validateRequest
];

// POST /api/v1/margin/calculate
router.post('/calculate', calculateValidation, calculateMargin);

// POST /api/v1/margin/parse-url
const parseUrlValidation = [
  body('url').isURL().withMessage('URL must be a valid URL'),
  validateRequest
];
router.post('/parse-url', parseUrlValidation, parseAuctionUrlController);

export const marginRoutes = router;
