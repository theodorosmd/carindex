import express from 'express';
import { runScraper, getScraperStatus, getScraperRunStatus } from '../controllers/scraperController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Scraper endpoints require authentication (used by admin dashboard)
router.post('/run', authMiddleware, runScraper);
router.get('/status', authMiddleware, getScraperStatus);
router.get('/run/:runId/status', authMiddleware, getScraperRunStatus);

export const scraperRoutes = router;

