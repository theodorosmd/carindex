import express from 'express';
import {
  getListingPriceHistory,
  getListingPriceDrops,
  getPriceDropsByModel,
  getUndervaluedListings
} from '../controllers/priceHistoryController.js';

const router = express.Router();

// Get price history for a listing
router.get('/listings/:id/price-history', getListingPriceHistory);

// Get price drops for a listing
router.get('/listings/:id/price-drops', getListingPriceDrops);

// Get price drops by model
router.get('/price-drops', getPriceDropsByModel);

// Get undervalued listings (hot deals)
router.get('/undervalued-listings', getUndervaluedListings);

export const priceHistoryRoutes = router;
