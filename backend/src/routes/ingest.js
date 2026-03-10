import express from 'express';
import { param, query } from 'express-validator';
import { ingestListings, ingestRawListings, triggerProcessRawListings } from '../controllers/ingestController.js';
import { queueAdd, queueAcquire, queueRelease } from '../controllers/mobileDeQueueController.js';
import { createRun, updateRun, listRuns, listRunListings, exportRunsCsv, exportRunListingsCsv } from '../controllers/ingestRunsController.js';
import { apiKeyIngestMiddleware } from '../middleware/apiKeyAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

const runIdValidation = [param('id').isUUID().withMessage('id must be a valid UUID'), validateRequest];
const listRunsValidation = [
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
  validateRequest
];

// Public ingest (API key only - pour scrapers, scripts, intégration directe Supabase)
const ingestPublicRouter = express.Router();
ingestPublicRouter.use(apiKeyIngestMiddleware);
ingestPublicRouter.post('/listings', ingestListings);
ingestPublicRouter.post('/raw', ingestRawListings);
ingestPublicRouter.post('/process-raw', triggerProcessRawListings);
ingestPublicRouter.post('/queue', queueAdd);
ingestPublicRouter.post('/queue/acquire', queueAcquire);
ingestPublicRouter.post('/queue/:id/release', runIdValidation, queueRelease);
ingestPublicRouter.post('/runs', createRun);
ingestPublicRouter.patch('/runs/:id', runIdValidation, updateRun);

// Protected routes (auth middleware applied in routes/index.js)
router.post('/listings', ingestListings);
router.post('/raw', ingestRawListings);
router.post('/process-raw', triggerProcessRawListings);
router.post('/runs', createRun);
router.patch('/runs/:id', runIdValidation, updateRun);
router.get('/runs', listRunsValidation, listRuns);
router.get('/runs/export/csv', exportRunsCsv);
router.get('/runs/:id/listings', runIdValidation, listRunListings);
router.get('/runs/:id/listings/export/csv', runIdValidation, exportRunListingsCsv);

export const ingestRoutes = router;
export const ingestPublicRoutes = ingestPublicRouter;
