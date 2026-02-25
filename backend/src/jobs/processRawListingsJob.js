import cron from 'node-cron';
import { processRawListings } from '../services/rawListingsProcessorService.js';
import { logger } from '../utils/logger.js';

const CRON_SCHEDULE = process.env.PROCESS_RAW_LISTINGS_CRON || '*/15 * * * *'; // Every 15 min
const BATCH_SIZE = parseInt(process.env.PROCESS_RAW_LISTINGS_BATCH_SIZE || '500', 10);

async function runProcessRawListingsJob() {
  try {
    logger.info('Running raw listings processor job...');
    const result = await processRawListings({ limit: BATCH_SIZE });
    if (result.processed > 0) {
      logger.info('Raw listings processor completed', result);
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
