import { addToQueue, acquireNext, releaseItem } from '../services/mobileDeQueueService.js';
import { incrementScraperRunCounters } from '../services/ingestRunsService.js';
import { logger } from '../utils/logger.js';

export async function queueAdd(req, res, next) {
  try {
    const { items } = req.body || {};
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Body must be { items: [{ url, title?, year?, price?, mileage?, images? }] }' }
      });
    }
    const result = await addToQueue(items);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Queue add error', { error: error.message });
    next(error);
  }
}

export async function queueAcquire(req, res, next) {
  try {
    const workerId = req.body?.worker_id || req.query?.worker_id || `worker-${Date.now()}`;
    const item = await acquireNext(workerId);
    if (!item) {
      return res.json({ success: true, item: null });
    }
    res.json({ success: true, item });
  } catch (error) {
    logger.error('Queue acquire error', { error: error.message });
    next(error);
  }
}

export async function queueRelease(req, res, next) {
  try {
    const { id } = req.params;
    const { status, retry_count, next_retry_at, last_error, run_id } = req.body || {};
    if (!id || !status) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Need id (path) and status (body)' }
      });
    }
    const normStatus = String(status).toLowerCase();
    if (normStatus === 'ok' && run_id) {
      await incrementScraperRunCounters(run_id);
    }
    await releaseItem(id, normStatus || status, {
      retryCount: retry_count,
      nextRetryAt: next_retry_at,
      lastError: last_error
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('Queue release error', { error: error.message });
    next(error);
  }
}
