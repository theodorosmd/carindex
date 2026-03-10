import cron from 'node-cron';
import { processRawListings } from '../services/rawListingsProcessorService.js';
import { logger } from '../utils/logger.js';

const CRON_SCHEDULE = process.env.PROCESS_RAW_LISTINGS_CRON || '*/5 * * * *'; // Every 5 min (was 15)
const BATCH_SIZE = parseInt(process.env.PROCESS_RAW_LISTINGS_BATCH_SIZE || '2000', 10);
const RETRY_COUNT = parseInt(process.env.PROCESS_RAW_LISTINGS_RETRIES || '2', 10);
const RETRY_DELAY_MS = parseInt(process.env.PROCESS_RAW_LISTINGS_RETRY_DELAY_MS || '10000', 10);

async function runProcessRawListingsJob() {
  const createOnly = process.env.INGEST_CREATE_ONLY === 'true';
  let lastError = null;

  for (let attempt = 1; attempt <= RETRY_COUNT + 1; attempt++) {
    try {
      logger.info('Running raw listings processor job...', { attempt: attempt > 1 ? `${attempt}/${RETRY_COUNT + 1}` : undefined });
      const result = await processRawListings({ limit: BATCH_SIZE, createOnly });
      if (result.processed > 0) {
        logger.info('Raw listings processor completed', {
          ...result,
          createOnly: createOnly ? 'yes' : 'no'
        });
      }
      return;
    } catch (error) {
      lastError = error;
      logger.error('Raw listings processor job failed', { error: error.message, attempt });
      if (attempt <= RETRY_COUNT) {
        logger.info(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  logger.error('Raw listings processor job failed after retries', { error: lastError?.message });
}

export function startProcessRawListingsJob() {
  cron.schedule(CRON_SCHEDULE, runProcessRawListingsJob);
  logger.info('Raw listings processor job scheduled', {
    cron: CRON_SCHEDULE,
    batchSize: BATCH_SIZE
  });
}
