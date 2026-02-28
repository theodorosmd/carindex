import cron from 'node-cron';
import { checkAlerts } from '../jobs/alertChecker.js';
import { startAutoScraperJobs } from '../jobs/autoScraperJob.js';
import { startContinuousScrapingJob } from '../jobs/continuousScrapingJob.js';
import { startDailyScrapingJob } from '../jobs/dailyScraping.js';
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

  if (!process.env.SCRAPE_DO_TOKEN && process.env.ENABLE_AUTO_SCRAPERS !== 'false') {
    logger.warn('SCRAPE_DO_TOKEN not set — LeBonCoin, Subito, coches.net, OtoMoto, 2ememain will fail. Scrape.do fallback unavailable for Blocket, Bytbil, mobile.de, Gaspedaal. Add token in Railway Variables.');
  }

  // Scraping continu : tourne jusqu'à tout scraper, puis recommence (désactive auto_scrapers + daily)
  if (process.env.ENABLE_CONTINUOUS_SCRAPING === 'true') {
    logger.info('Continuous scraping enabled - scrapers run until all sources are scraped, then repeat');
    startContinuousScrapingJob();
    // Ne pas démarrer les crons individuels (chaque 6h) ni le daily (6h du matin)
  } else {
    // Start auto scraper jobs (cron par source, ex. toutes les 6h)
    if (process.env.ENABLE_AUTO_SCRAPERS !== 'false') {
      startAutoScraperJobs();
    }

    // Start daily scraping job (runs at 6 AM)
    if (process.env.ENABLE_DAILY_SCRAPING !== 'false') {
      startDailyScrapingJob();
    }
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

  // Scraping complet de toutes les sources (tous les véhicules) - hebdomadaire dimanche 3h
  if (process.env.ENABLE_FULL_SCRAPE_CRON === 'true') {
    cron.schedule('0 3 * * 0', async () => {
      logger.info('Full scrape cron: starting run-all-scrapers-full...');
      try {
        const { runAllScrapersFull } = await import('./run-all-scrapers-full.js');
        await runAllScrapersFull();
      } catch (error) {
        logger.error('Full scrape cron failed', { error: error.message });
      }
    }, { scheduled: true, timezone: 'Europe/Paris' });
    logger.info('Full scrape cron scheduled (Sundays 3:00 AM)');
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
  logger.info(
    process.env.ENABLE_CONTINUOUS_SCRAPING === 'true'
      ? 'Continuous scraping enabled (run until all scraped, then repeat)'
      : 'Auto scrapers enabled: ' + (process.env.ENABLE_AUTO_SCRAPERS !== 'false')
  );
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

