#!/usr/bin/env node
/**
 * Run Django import from the mobile.de Django server (port 8002)
 * Uses DJANGO_MOBILEDE_* env vars (Bytbil=8001, Mobile.de=8002)
 *
 * Add to .env:
 *   DJANGO_MOBILEDE_BASE_URL=http://75.119.141.234:8002
 *   DJANGO_MOBILEDE_USERNAME=admin
 *   DJANGO_MOBILEDE_PASSWORD=admin
 *
 * Reprise après interruption : DJANGO_IMPORT_START_PAGE=6157
 *   (démarre à la page 6157, évite de refaire les 6156 premières)
 *
 * Run: node src/scripts/run-django-import-mobilede.js
 * Or in background: nohup node src/scripts/run-django-import-mobilede.js >> django-mobilede.log 2>&1 &
 * Check progress: node src/scripts/check-django-import-progress.js
 *
 * Retry on fetch failure: DJANGO_FETCH_RETRY_MAX=5, DJANGO_FETCH_RETRY_DELAY_MS=5000
 */
import 'dotenv/config';
import { runDjangoImportOnce } from '../jobs/djangoImportJob.js';
import { logger } from '../utils/logger.js';

const startPage = parseInt(process.env.DJANGO_IMPORT_START_PAGE || '1', 10);

const overrides = {
  baseUrl: process.env.DJANGO_MOBILEDE_BASE_URL || 'http://75.119.141.234:8002',
  username: process.env.DJANGO_MOBILEDE_USERNAME || process.env.DJANGO_API_USERNAME,
  password: process.env.DJANGO_MOBILEDE_PASSWORD || process.env.DJANGO_API_PASSWORD,
  extraQuery: process.env.DJANGO_API_CARS_QUERY || '',
  ...(startPage > 1 && { startPage }),
  ...(process.env.DJANGO_IMPORT_USE_PAGE_PARAM && { usePageParam: true })
};

async function main() {
  logger.info('Starting Django import (mobile.de server)', {
    baseUrl: overrides.baseUrl,
    ...(startPage > 1 && { startPage })
  });

  try {
    await runDjangoImportOnce(overrides);
    logger.info('Django mobile.de import completed successfully');
  } catch (error) {
    logger.error('Django mobile.de import failed', { error: error.message });
    process.exit(1);
  }

  process.exit(0);
}

main();
