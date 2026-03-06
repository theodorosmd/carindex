import cron from 'node-cron';
import { checkAlerts } from '../jobs/alertChecker.js';
import { startContinuousScrapingJob } from '../jobs/continuousScrapingJob.js';
import { startSalesDetectionJob } from '../jobs/salesDetectionJob.js';
import { startDjangoImportJob, startDjangoLeboncoinImportJob } from '../jobs/djangoImportJob.js';
import { startSupabaseBytbilImportJob } from '../jobs/supabaseBytbilImportJob.js';
import { startMobileDeImportJob } from '../jobs/mobileDeImportJob.js';
import { startImageBackfillJob } from '../jobs/imageBackfillJob.js';
import { startProcessRawListingsJob } from '../jobs/processRawListingsJob.js';
import { startArbitrageDetectionJob } from '../jobs/arbitrageDetectionJob.js';
import { logger } from '../utils/logger.js';

/**
 * Start cron jobs for scheduled tasks
 */
export function startCronJobs() {
  logger.info('Starting cron jobs...');

  if (!process.env.SCRAPE_DO_TOKEN) {
    logger.warn('SCRAPE_DO_TOKEN not set — LeBonCoin, Subito, coches.net, OtoMoto, 2ememain will fail. Scrape.do fallback unavailable for Blocket, Bytbil, mobile.de, Gaspedaal. Add token in Railway Variables.');
  }

  // UN SEUL SYSTÈME DE SCRAPING : run-all-scrapers-full
  // Option 1: continu (boucle jusqu'à 100%, puis recommence)
  // Option 2: cron quotidien (ex. 3h du matin)
  if (process.env.ENABLE_CONTINUOUS_SCRAPING === 'true') {
    logger.info('Scraping: mode continu (run-all-scrapers-full en boucle)');
    startContinuousScrapingJob();
  } else {
    // Cron quotidien : run-all-scrapers-full à 3h (configurable via SCRAPE_CRON)
    const scrapeCron = process.env.SCRAPE_CRON || '0 3 * * *'; // default: daily 3h
    cron.schedule(scrapeCron, async () => {
      logger.info('Scrape cron: starting run-all-scrapers-full...');
      try {
        const { runAllScrapersFull } = await import('./run-all-scrapers-full.js');
        await runAllScrapersFull();
      } catch (error) {
        logger.error('Scrape cron failed', { error: error.message });
      }
    }, { scheduled: true, timezone: 'Europe/Paris' });
    logger.info('Scraping: cron quotidien', { cron: scrapeCron });
  }

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

  // Auto-detect arbitrage opportunities (daily at 4:00)
  if (process.env.ENABLE_ARBITRAGE_DETECTION !== 'false') {
    startArbitrageDetectionJob();
  }

  // listing_stats_cache is kept up-to-date by DB triggers (trg_listing_stats_cache).
  // No backend cron needed — avoids full table scans and Disk IO spikes.

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

