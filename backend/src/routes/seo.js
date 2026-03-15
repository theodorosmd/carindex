import express from 'express';
import {
  getMarketPriceHub,
  getBrandPage,
  getBrandModelPage,
  getSitemap,
} from '../controllers/seoController.js';

const router = express.Router();

// GET /sitemap.xml
router.get('/sitemap.xml', getSitemap);

// GET /prix-marche
router.get('/prix-marche', getMarketPriceHub);

// GET /prix-marche/:brand
router.get('/prix-marche/:brand', getBrandPage);

// GET /prix-marche/:brand/:model
router.get('/prix-marche/:brand/:model', getBrandModelPage);

export const seoRoutes = router;
