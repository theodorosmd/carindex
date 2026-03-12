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
import { fetchAndParseDetailPage } from '../services/mobiledeService.js';
import { logger } from '../utils/logger.js';

const SOURCE_PLATFORM = 'mobile_de';
const DELAY_MS = parseInt(process.env.MOBILEDE_QUEUE_DELAY_MS || '1500', 10);
const MAX_RETRIES = 3;

function buildRawItemFromQueue(queueItem) {
  // Extract numeric ID from either /details/XXXX or ?id=XXXX (search result URLs)
  const idMatch = queueItem.url?.match(/[?&]id=(\d+)/) || queueItem.url?.match(/\/details\/(\d+)/);
  const sourceId = idMatch ? idMatch[1] : queueItem.url;

  // Normalize URL to clean detail URL — prevents varchar(255) overflow from search params
  // e.g. "...details.html?id=447492475&isSearchRequest=true&mak=40&pageNumber=51&..." → "...?id=447492475"
  const cleanUrl = sourceId && /^\d+$/.test(sourceId)
    ? `https://suchen.mobile.de/fahrzeuge/details.html?id=${sourceId}`
    : queueItem.url;

  const parts = (queueItem.title || '').trim().split(/\s+/);
  const brand = parts[0] || null;
  const model = parts.slice(1).join(' ') || null;

  return {
    url: cleanUrl,
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
    // Fetch detail page specs (power, fuel, color, doors, displacement, transmission, drivetrain, description)
    // This is the primary mechanism for getting rich specs on new mobile_de listings.
    // render=false + 20s timeout (set inside fetchAndParseDetailPage) — single attempt, no retry on 410.
    let specs = {};
    try {
      specs = await fetchAndParseDetailPage(item.url);
    } catch (detailErr) {
      // Non-fatal: detail page fetch failing shouldn't block the listing from being saved
      logger.debug('mobilede-queue: detail page fetch failed (non-fatal)', { url: item.url, error: detailErr.message });
    }

    // 410 Gone — listing no longer exists on mobile.de
    if (specs?.gone) {
      await releaseItem(item.id, 'gone');
      return { processed: 1, saved: 0, gone: true };
    }

    // Merge detail specs into raw item (power_hp → read by mapper as item.power_hp)
    const rawItem = { ...buildRawItemFromQueue(item), ...specs };
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

    // 410 = listing deleted on mobile.de — mark as gone, never retry
    const is410 = err.message?.includes('410') || err.message?.includes('Gone');
    if (is410) {
      await releaseItem(item.id, 'gone', { lastError: err.message });
      return { processed: 1, saved: 0, gone: true };
    }

    const retryCount = (item.retry_count || 0) + 1;
    if (retryCount >= MAX_RETRIES) {
      await releaseItem(item.id, 'error', { retryCount, lastError: err.message });
    } else {
      const nextRetry = new Date(Date.now() + 60_000 * retryCount).toISOString();
      await releaseItem(item.id, 'retry', {
        retryCount,
        nextRetryAt: nextRetry,
        lastError: err.message,
      });
    }
    return { processed: 1, saved: 0, error: err.message };
  }
}

async function runWorker() {
  const workerId = process.env.WORKER_ID || `worker-${process.pid}-${Date.now()}`;
  logger.info('mobilede-queue worker started', { workerId });

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
          logger.info('mobilede-queue progress', { workerId, totalProcessed, totalSaved });
        }
      } else {
        emptyCount++;
        if (emptyCount === 1 || emptyCount % 12 === 0) {
          logger.info('mobilede-queue: queue empty, waiting...', { workerId, totalProcessed });
        }
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
