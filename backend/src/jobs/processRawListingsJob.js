import cron from 'node-cron';
import { processRawListings } from '../services/rawListingsProcessorService.js';
import { logger } from '../utils/logger.js';

const CRON_SCHEDULE = process.env.PROCESS_RAW_LISTINGS_CRON || '*/5 * * * *'; // Every 5 min (was 15)
const BATCH_SIZE = parseInt(process.env.PROCESS_RAW_LISTINGS_BATCH_SIZE || '2000', 10);

// Guard: prevent concurrent runs if previous job is still draining the queue
let isRunning = false;

async function runProcessRawListingsJob() {
  if (isRunning) {
    logger.debug('Raw listings processor already running, skipping cron tick');
    return;
  }

  isRunning = true;
  const createOnly = process.env.INGEST_CREATE_ONLY === 'true';
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;

  try {
    let batch;
    do {
      try {
        batch = await processRawListings({ limit: BATCH_SIZE, createOnly });
      } catch (error) {
        logger.error('Raw listings processor batch failed', { error: error.message, totalProcessed });
        break;
      }

      if ((batch.processed ?? 0) > 0) {
        totalProcessed += batch.processed ?? 0;
        totalCreated += batch.created ?? 0;
        totalUpdated += batch.updated ?? 0;
        logger.info('Raw listings processor batch done', {
          batch: batch.processed,
          created: batch.created,
          updated: batch.updated,
          totalProcessed,
          createOnly: createOnly ? 'yes' : 'no'
        });
      }
    } while ((batch?.processed ?? 0) >= BATCH_SIZE);

    if (totalProcessed > 0) {
      logger.info('Raw listings processor queue drained', { totalProcessed, totalCreated, totalUpdated });
    }
  } finally {
    isRunning = false;
  }
}

export function startProcessRawListingsJob() {
  cron.schedule(CRON_SCHEDULE, runProcessRawListingsJob);
  logger.info('Raw listings processor job scheduled', {
    cron: CRON_SCHEDULE,
    batchSize: BATCH_SIZE
  });
}
