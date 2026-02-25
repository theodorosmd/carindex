/**
 * Import mobile.de vers Supabase (sans Django)
 * Flux : Puppeteer scrape mobile.de → raw_listings → processRawListings → listings
 * Toutes les écritures passent par l'API Supabase (client REST)
 */
import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { runMobileDeScraper } from '../services/mobiledeService.js';

const DEFAULT_CRON = '0 3 * * *'; // 3h du matin

const DEFAULT_SEARCH_URLS = [
  'https://www.mobile.de/fahrzeuge/suche.html',
  'https://www.mobile.de/fahrzeuge/suche.html?fc=17', // Voitures
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

  const result = await runMobileDeScraper(searchUrls, { maxPages });
  logger.info('mobile.de import completed', result);
  return result;
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

  if (process.env.RUN_MOBILEDE_IMPORT_ON_STARTUP === 'true') {
    setTimeout(async () => {
      try {
        await runMobileDeImportOnce();
      } catch (error) {
        logger.error('Error in initial mobile.de import', { error: error.message });
      }
    }, 10000);
  }
}
