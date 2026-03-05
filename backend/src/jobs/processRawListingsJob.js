import cron from 'node-cron';
import { processRawListings } from '../services/rawListingsProcessorService.js';
import { logger } from '../utils/logger.js';

const CRON_SCHEDULE = process.env.PROCESS_RAW_LISTINGS_CRON || '*/5 * * * *'; // Every 5 min (was 15)
const BATCH_SIZE = parseInt(process.env.PROCESS_RAW_LISTINGS_BATCH_SIZE || '2000', 10);

async function runProcessRawListingsJob() {
  try {
    logger.info('Running raw listings processor job...');
    const createOnly = process.env.INGEST_CREATE_ONLY === 'true';
    const result = await processRawListings({ limit: BATCH_SIZE, createOnly });
    if (result.processed > 0) {
      logger.info('Raw listings processor completed', {
        ...result,
        createOnly: createOnly ? 'yes' : 'no'
      });
    }
  } catch (error) {
    logger.error('Raw listings processor job failed', { error: error.message });
  }
}

export function startProcessRawListingsJob() {
  cron.schedule(CRON_SCHEDULE, runProcessRawListingsJob);
  logger.info('Raw listings processor job scheduled', {
    cron: CRON_SCHEDULE,
    batchSize: BATCH_SIZE
  });
}
