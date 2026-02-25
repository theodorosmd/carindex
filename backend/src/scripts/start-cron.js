import cron from 'node-cron';
import { checkAlerts } from '../jobs/alertChecker.js';
import { startAutoScraperJobs } from '../jobs/autoScraperJob.js';
import { startDailyScrapingJob } from '../jobs/dailyScraping.js';
import { startSalesDetectionJob } from '../jobs/salesDetectionJob.js';
import { startDjangoImportJob, startDjangoLeboncoinImportJob } from '../jobs/djangoImportJob.js';
import { startSupabaseBytbilImportJob } from '../jobs/supabaseBytbilImportJob.js';
import { startMobileDeImportJob } from '../jobs/mobileDeImportJob.js';
import { startImageBackfillJob } from '../jobs/imageBackfillJob.js';
import { startProcessRawListingsJob } from '../jobs/processRawListingsJob.js';
import { logger } from '../utils/logger.js';

/**
 * Start cron jobs for scheduled tasks
 */
export function startCronJobs() {
  logger.info('Starting cron jobs...');

  // Check alerts every hour
  // Cron format: minute hour day month day-of-week
  // '0 * * * *' = every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    logger.info('Running scheduled alert check...');
    try {
      await checkAlerts();
    } catch (error) {
      logger.error('Error in scheduled alert check', { error: error.message });
    }
  });

  // Start auto scraper jobs
  if (process.env.ENABLE_AUTO_SCRAPERS !== 'false') {
    startAutoScraperJobs();
  }

  // Start daily scraping job (runs at 6 AM)
  if (process.env.ENABLE_DAILY_SCRAPING !== 'false') {
    startDailyScrapingJob();
  }

  // Start sales detection job (runs every 6 hours)
  if (process.env.ENABLE_SALES_DETECTION !== 'false') {
    startSalesDetectionJob();
  }

  // mobile.de import → Supabase (Puppeteer, sans Django) - remplace l'import Django mobile.de
  if (process.env.ENABLE_MOBILEDE_IMPORT !== 'false') {
    startMobileDeImportJob();
  }

  // Bytbil import depuis Supabase scraper_listings (remplace Django bytbil)
  if (process.env.ENABLE_SUPABASE_BYTBIL_IMPORT !== 'false') {
    startSupabaseBytbilImportJob();
  }

  // Django API import (autres sources: mobilede, etc. sur serveur Django)
  if (process.env.ENABLE_DJANGO_IMPORT === 'true') {
    startDjangoImportJob();
  }

  // Start Django Leboncoin import job (daily)
  if (process.env.ENABLE_DJANGO_LEBONCOIN_IMPORT !== 'false') {
    startDjangoLeboncoinImportJob();
  }

  // Start image backfill job (daily)
  if (process.env.ENABLE_IMAGE_BACKFILL !== 'false') {
    startImageBackfillJob();
  }

  // Stage 2: Process raw_listings into listings (every 15 min)
  if (process.env.ENABLE_RAW_LISTINGS_PROCESSOR !== 'false') {
    startProcessRawListingsJob();
  }

  // Also run immediately on startup (optional, for testing)
  if (process.env.RUN_ALERTS_ON_STARTUP === 'true') {
    logger.info('Running initial alert check on startup...');
    setTimeout(async () => {
      try {
        await checkAlerts();
      } catch (error) {
        logger.error('Error in initial alert check', { error: error.message });
      }
    }, 5000); // Wait 5 seconds after startup
  }

  logger.info('Cron jobs started successfully');
  logger.info('Alert check scheduled to run every hour');
  logger.info('Auto scrapers enabled:', process.env.ENABLE_AUTO_SCRAPERS !== 'false');
}

// If running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  startCronJobs();
  
  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('Stopping cron jobs...');
    process.exit(0);
  });
}

