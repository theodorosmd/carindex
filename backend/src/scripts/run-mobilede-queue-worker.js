/**
 * Worker pour traiter la queue mobile_de_fetch_queue (remplace Oleg).
 * Acquire → save raw → process → release.
 *
 * Usage:
 *   node -r dotenv/config src/scripts/run-mobilede-queue-worker.js
 *   WORKER_ID=worker-1 node -r dotenv/config src/scripts/run-mobilede-queue-worker.js
 *
 * Lancer plusieurs workers en parallèle (PM2):
 *   pm2 start ecosystem.config.cjs --only carindex-mobilede-worker
 *   pm2 scale carindex-mobilede-worker 10
 */
import { acquireNext, releaseItem } from '../services/mobileDeQueueService.js';
import { saveRawListings } from '../services/rawIngestService.js';
import { processRawListings } from '../services/rawListingsProcessorService.js';
import { logger } from '../utils/logger.js';

const SOURCE_PLATFORM = 'mobile_de';
const DELAY_MS = parseInt(process.env.MOBILEDE_QUEUE_DELAY_MS || '1500', 10);
const MAX_RETRIES = 3;

function buildRawItemFromQueue(queueItem) {
  const idMatch = queueItem.url?.match(/\/details\/(\d+)/);
  const sourceId = idMatch ? idMatch[1] : queueItem.url;
  const parts = (queueItem.title || '').trim().split(/\s+/);
  const brand = parts[0] || null;
  const model = parts.slice(1).join(' ') || null;

  return {
    url: queueItem.url,
    id: sourceId,
    ad_id: sourceId,
    brand,
    model,
    title: queueItem.title,
    year: queueItem.year ?? null,
    price: queueItem.price ?? null,
    mileage: queueItem.mileage ?? null,
    images: Array.isArray(queueItem.images) ? queueItem.images : [],
    country: 'DE',
  };
}

async function processOne(workerId) {
  const item = await acquireNext(workerId);
  if (!item) return null;

  try {
    const rawItem = buildRawItemFromQueue(item);
    const { saved } = await saveRawListings([rawItem], SOURCE_PLATFORM);
    if (saved === 0) {
      logger.warn('mobilede-queue: raw save returned 0', { url: item.url });
    }
    const result = await processRawListings({
      limit: 10,
      sourcePlatform: SOURCE_PLATFORM,
    });
    const totalSaved = (result.created || 0) + (result.updated || 0) + (result.sourceAdded || 0);
    await releaseItem(item.id, 'ok');
    return { processed: 1, saved: totalSaved };
  } catch (err) {
    logger.error('mobilede-queue: process failed', { url: item.url, error: err.message });
    const retryCount = 1;
    const nextRetry = new Date(Date.now() + 60 * 1000).toISOString();
    await releaseItem(item.id, 'retry', {
      retryCount,
      nextRetryAt: nextRetry,
      lastError: err.message,
    });
    return { processed: 1, saved: 0, error: err.message };
  }
}

async function runWorker() {
  const workerId = process.env.WORKER_ID || `worker-${process.pid}-${Date.now()}`;
  logger.info('mobilede-queue worker started', { workerId });

  let totalProcessed = 0;
  let totalSaved = 0;

  while (true) {
    try {
      const result = await processOne(workerId);
      if (result) {
        totalProcessed += result.processed;
        totalSaved += result.saved || 0;
        if (totalProcessed % 50 === 0 && totalProcessed > 0) {
          logger.info('mobilede-queue progress', { workerId, totalProcessed, totalSaved });
        }
      } else {
        await new Promise((r) => setTimeout(r, 5000));
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    } catch (err) {
      logger.error('mobilede-queue worker error', { workerId, error: err.message });
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

runWorker().catch((err) => {
  logger.error('mobilede-queue worker fatal', { error: err.message });
  process.exit(1);
});
