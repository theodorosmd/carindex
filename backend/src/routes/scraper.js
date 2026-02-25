import express from 'express';
import { runScraper, getScraperStatus, getScraperRunStatus } from '../controllers/scraperController.js';

const router = express.Router();

// Run scraper (public for now, add auth later)
router.post('/run', runScraper);

// Get scraper status
router.get('/status', getScraperStatus);

// Get specific run status (for polling progress)
router.get('/run/:runId/status', getScraperRunStatus);

export const scraperRoutes = router;

