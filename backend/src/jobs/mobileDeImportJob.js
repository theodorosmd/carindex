/**
 * Import mobile.de vers Supabase (sans Django)
 * Flux : Puppeteer scrape mobile.de → raw_listings → processRawListings → listings
 * Toutes les écritures passent par l'API Supabase (client REST)
 */
import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { runMobileDeScraper } from '../services/mobiledeService.js';
import { createScraperRun, updateScraperRun } from '../services/ingestRunsService.js';

const DEFAULT_CRON = '0 3 * * *'; // 3h du matin

const DEFAULT_SEARCH_URLS = [
  'https://suchen.mobile.de/fahrzeuge/detailsuche/?cn=DE&s=Car&vc=Car',
];

export async function runMobileDeImportOnce(options = {}) {
  const searchUrls = options.searchUrls ||
    (process.env.MOBILEDE_SEARCH_URLS
      ? process.env.MOBILEDE_SEARCH_URLS.split(',').map((u) => u.trim())
      : DEFAULT_SEARCH_URLS);
  const maxPages = options.maxPages ?? parseInt(process.env.MOBILEDE_MAX_PAGES || '50', 10);

  logger.info('Starting mobile.de import (Puppeteer → Supabase)', {
    searchUrls,
    maxPages
  });

  let runId = null;
  try {
    const run = await createScraperRun({
      source_platform: 'mobile.de',
      status: 'running'
    });
    runId = run?.id || null;
  } catch (runErr) {
    logger.warn('Could not create scraper run for mobile.de', { error: runErr.message });
  }

  try {
    const result = await runMobileDeScraper(searchUrls, { maxPages });
    logger.info('mobile.de import completed', result);

    if (runId) {
      await updateScraperRun(runId, {
        status: 'success',
        total_scraped: result.totalScraped || 0,
        total_saved: result.saved || 0,
        total_failed: result.errors || 0
      });
    }

    return result;
  } catch (error) {
    logger.error('mobile.de import failed', { error: error.message });
    if (runId) {
      await updateScraperRun(runId, {
        status: 'failed',
        error_message: error.message
      });
    }
    throw error;
  }
}

export function startMobileDeImportJob() {
  const cronExpression = process.env.MOBILEDE_IMPORT_CRON || DEFAULT_CRON;
  logger.info('Starting mobile.de import job (Supabase)', { cronExpression });

  cron.schedule(cronExpression, async () => {
    logger.info('Running scheduled mobile.de import...');
    try {
      await runMobileDeImportOnce();
    } catch (error) {
      logger.error('Error in scheduled mobile.de import', { error: error.message });
    }
  });

  // 1 fois au démarrage (à l'heure actuelle) — désactiver avec RUN_MOBILEDE_IMPORT_ON_STARTUP=false
  if (process.env.RUN_MOBILEDE_IMPORT_ON_STARTUP !== 'false') {
    setTimeout(async () => {
      try {
        await runMobileDeImportOnce();
      } catch (error) {
        logger.error('Error in initial mobile.de import', { error: error.message });
      }
    }, 10000);
  }
}
