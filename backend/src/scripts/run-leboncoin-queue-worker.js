/**
 * Worker pour traiter la queue leboncoin_fetch_queue.
 * Acquire → fetch détail (scrape.do) → save raw → process → release.
 *
 * Usage:
 *   node -r dotenv/config src/scripts/run-leboncoin-queue-worker.js
 *   WORKER_ID=worker-1 node -r dotenv/config src/scripts/run-leboncoin-queue-worker.js
 *
 * Lancer plusieurs workers (PM2):
 *   pm2 start ecosystem.config.cjs --only carindex-leboncoin-worker
 *   pm2 scale carindex-leboncoin-worker 5
 */
import { acquireNext, releaseItem } from '../services/leboncoinQueueService.js';
import { fetchListingDetails } from '../services/leboncoinService.js';
import { saveRawListings } from '../services/rawIngestService.js';
import { processRawListings } from '../services/rawListingsProcessorService.js';
import { logger } from '../utils/logger.js';

const SOURCE_PLATFORM = 'leboncoin';
const DELAY_MS = parseInt(process.env.LEBONCOIN_QUEUE_DELAY_MS || '200', 10);
const MAX_RETRIES = 3;

async function processOne(workerId) {
  const item = await acquireNext(workerId);
  if (!item) return null;

  try {
    const details = await fetchListingDetails(item.url);
    const idMatch = item.url?.match(/\/ad\/voitures\/(\d+)/);
    const id = idMatch ? idMatch[1] : item.url;

    const merged = {
      url: item.url,
      id,
      brand: item.brand || details?.jsonBrand || null,
      model: item.model || details?.jsonModel || null,
      title: item.title || details?.fullTitle || null,
      price: details?.price ?? item.price ?? null,
      year: details?.jsonYear ?? item.year ?? null,
      mileage: details?.jsonMileage ?? item.mileage ?? null,
      ...details
    };

    const { saved } = await saveRawListings([merged], SOURCE_PLATFORM);
    if (saved === 0) {
      logger.warn('leboncoin-queue: raw save returned 0', { url: item.url });
    }
    const result = await processRawListings({
      limit: 10,
      sourcePlatform: SOURCE_PLATFORM
    });
    const totalSaved = (result.created || 0) + (result.updated || 0) + (result.sourceAdded || 0);
    await releaseItem(item.id, 'ok');
    return { processed: 1, saved: totalSaved };
  } catch (err) {
    const is410Gone = err.message?.includes('scrape.do 410') || err.message?.includes('410:');
    if (is410Gone) {
      // Annonce supprimée sur Leboncoin — ne pas retry
      await releaseItem(item.id, 'gone', { lastError: err.message });
      return { processed: 1, saved: 0, gone: true };
    }
    logger.error('leboncoin-queue: process failed', { url: item.url, error: err.message });
    const retryCount = 1;
    const nextRetry = new Date(Date.now() + 60 * 1000).toISOString();
    await releaseItem(item.id, 'retry', {
      retryCount,
      nextRetryAt: nextRetry,
      lastError: err.message
    });
    return { processed: 1, saved: 0, error: err.message };
  }
}

async function runWorker() {
  const workerId = process.env.WORKER_ID || `worker-${process.pid}-${Date.now()}`;
  logger.info('leboncoin-queue worker started', { workerId });

  let totalProcessed = 0;
  let totalSaved = 0;
  let emptyCount = 0;

  while (true) {
    try {
      const result = await processOne(workerId);
      if (result) {
        emptyCount = 0;
        totalProcessed += result.processed;
        totalSaved += result.saved || 0;
        if (totalProcessed % 50 === 0 && totalProcessed > 0) {
          logger.info('leboncoin-queue progress', { workerId, totalProcessed, totalSaved });
        }
      } else {
        emptyCount++;
        if (emptyCount === 1 || emptyCount % 12 === 0) {
          logger.info('leboncoin-queue: queue empty, waiting...', { workerId, totalProcessed });
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    } catch (err) {
      logger.error('leboncoin-queue worker error', { workerId, error: err.message });
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

runWorker().catch((err) => {
  logger.error('leboncoin-queue worker fatal', { error: err.message });
  process.exit(1);
});
