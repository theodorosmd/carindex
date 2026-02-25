import express from 'express';
import { getFacets, clearFacetsCacheController } from '../controllers/facetsController.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getFacets);
router.post('/clear-cache', authMiddleware, requireAdmin, clearFacetsCacheController);

export const facetsRoutes = router;


