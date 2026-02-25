#!/usr/bin/env node
/**
 * Lance l'import mobile.de vers Supabase (Puppeteer, sans Django)
 * Flux : scrape mobile.de → raw_listings → Supabase REST → listings
 *
 * .env :
 *   MOBILEDE_SEARCH_URLS=https://www.mobile.de/fahrzeuge/suche.html (optionnel)
 *   MOBILEDE_MAX_PAGES=50 (par URL)
 *
 * Run: node src/scripts/run-mobilede-import.js
 * Ou: nohup node src/scripts/run-mobilede-import.js >> mobilede-import.log 2>&1 &
 */
import 'dotenv/config';
import { runMobileDeImportOnce } from '../jobs/mobileDeImportJob.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info('Starting mobile.de import (Supabase REST)');
  try {
    await runMobileDeImportOnce();
    logger.info('mobile.de import completed successfully');
  } catch (error) {
    logger.error('mobile.de import failed', { error: error.message });
    process.exit(1);
  }
  process.exit(0);
}

main();
