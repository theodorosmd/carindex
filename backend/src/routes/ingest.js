import express from 'express';
import { ingestListings, ingestRawListings, triggerProcessRawListings } from '../controllers/ingestController.js';
import { queueAdd, queueAcquire, queueRelease } from '../controllers/mobileDeQueueController.js';
import { createRun, updateRun, listRuns, listRunListings, exportRunsCsv, exportRunListingsCsv } from '../controllers/ingestRunsController.js';
import { apiKeyIngestMiddleware } from '../middleware/apiKeyAuth.js';

const router = express.Router();

// Public ingest (API key only - pour scrapers, scripts, intégration directe Supabase)
const ingestPublicRouter = express.Router();
ingestPublicRouter.use(apiKeyIngestMiddleware);
ingestPublicRouter.post('/listings', ingestListings);
ingestPublicRouter.post('/raw', ingestRawListings);
ingestPublicRouter.post('/process-raw', triggerProcessRawListings);
ingestPublicRouter.post('/queue', queueAdd);
ingestPublicRouter.post('/queue/acquire', queueAcquire);
ingestPublicRouter.post('/queue/:id/release', queueRelease);
ingestPublicRouter.post('/runs', createRun);
ingestPublicRouter.patch('/runs/:id', updateRun);

// Protected routes (auth middleware applied in routes/index.js)
router.post('/listings', ingestListings);
router.post('/raw', ingestRawListings);
router.post('/process-raw', triggerProcessRawListings);
router.post('/runs', createRun);
router.patch('/runs/:id', updateRun);
router.get('/runs', listRuns);
router.get('/runs/export/csv', exportRunsCsv);
router.get('/runs/:id/listings', listRunListings);
router.get('/runs/:id/listings/export/csv', exportRunListingsCsv);

export const ingestRoutes = router;
export const ingestPublicRoutes = ingestPublicRouter;
