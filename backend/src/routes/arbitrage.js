import express from 'express';
import {
  getPriceComparisonEndpoint,
  getArbitrageOpportunitiesEndpoint,
  getListingsArbitrageEndpoint,
  getImportCostSimulatorEndpoint,
  getArbitrageMarginEstimateEndpoint,
  getTaxRulesEndpoint
} from '../controllers/arbitrageController.js';

const router = express.Router();

// /auto-detected is public, mounted separately in index.js
router.get('/price-comparison', getPriceComparisonEndpoint);
router.get('/opportunities', getArbitrageOpportunitiesEndpoint);
router.get('/listings', getListingsArbitrageEndpoint);
router.get('/import-costs', getImportCostSimulatorEndpoint);
router.get('/margin-estimate', getArbitrageMarginEstimateEndpoint);
router.get('/tax-rules', getTaxRulesEndpoint);

export const arbitrageRoutes = router;
