#!/usr/bin/env node
/**
 * Run full Django import (all pages)
 * Can take 1-2 hours for 200k+ cars. Run in background:
 *
 *   nohup node src/scripts/run-django-import.js > django-import.log 2>&1 &
 *
 * Optional: import only mobile.de cars (if your Django API supports it):
 *   DJANGO_API_CARS_QUERY="source=mobile_de" node src/scripts/run-django-import.js
 *
 * Optional: limit pages for a quick test:
 *   DJANGO_API_MAX_PAGES=10 node src/scripts/run-django-import.js
 *
 * Retry on fetch failure: DJANGO_FETCH_RETRY_MAX=5 (default), DJANGO_FETCH_RETRY_DELAY_MS=5000
 */
import 'dotenv/config';
import { runDjangoImportOnce } from '../jobs/djangoImportJob.js';
import { logger } from '../utils/logger.js';

async function main() {
  const query = process.env.DJANGO_API_CARS_QUERY || '';
  const maxPages = process.env.DJANGO_API_MAX_PAGES || '0';

  logger.info('Starting full Django import', {
    DJANGO_API_CARS_QUERY: query || '(none)',
    DJANGO_API_MAX_PAGES: maxPages || 'all'
  });

  try {
    await runDjangoImportOnce();
    logger.info('Django import completed successfully');
  } catch (error) {
    logger.error('Django import failed', { error: error.message });
    process.exit(1);
  }

  process.exit(0);
}

main();
