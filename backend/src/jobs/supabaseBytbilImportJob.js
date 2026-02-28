import cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { mapDjangoCarToListing } from './djangoImportJob.js';
import { upsertListingsBatch } from '../services/ingestService.js';
import { createScraperRun, updateScraperRun } from '../services/ingestRunsService.js';

const BATCH_SIZE = 500;
const DEFAULT_CRON = '0 3 * * *'; // 3 AM daily

function mapScraperListingToCar(row) {
  const match = (row.link || '').match(/-([a-z0-9-]{36}|[0-9]+)\/?$/);
  const sourceId = match ? match[1] : String(row.id);
  return {
    ...row,
    source: 'bytbil',
    source_id: sourceId,
    url: row.link,
    images: Array.isArray(row.img_links) ? row.img_links : (row.img_link ? [row.img_link] : []),
    features: Array.isArray(row.equipment) ? row.equipment : [],
    dealer_phones: row.organization_phone ? [row.organization_phone] : [],
    first_seen_at: row.first_seen_at,
    last_seen_at: row.scraped_at
  };
}

export async function runSupabaseBytbilImportOnce() {
  logger.info('Starting Supabase Bytbil import');

  let runId = null;
  try {
    const run = await createScraperRun({
      source_platform: 'bytbil',
      status: 'running'
    });
    runId = run?.id || null;
  } catch (runErr) {
    logger.warn('Could not create scraper run for Bytbil', { error: runErr.message });
  }

  let offset = 0;
  let totalImported = 0;
  let totalRowsProcessed = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const { data: rows, error } = await supabase
        .from('scraper_listings')
        .select('*')
        .eq('source', 'bytbil')
        .eq('status', 'OK')
        .order('first_seen_at', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      if (!rows || rows.length === 0) {
        hasMore = false;
        break;
      }

      const cars = rows.map(mapScraperListingToCar);
      const listings = cars.map((c) => mapDjangoCarToListing(c, { sourceOverride: 'bytbil' }));

      const result = await upsertListingsBatch(listings, {
        allowMissingRequired: true,
        useBulkUpsert: true
      });

      totalImported += result.created + result.updated;
      totalRowsProcessed += rows.length;

      logger.info('Supabase Bytbil import batch', {
        offset,
        fetched: rows.length,
        created: result.created,
        updated: result.updated
      });

      if (rows.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    logger.info('Supabase Bytbil import completed', { totalImported });

    if (runId) {
      await updateScraperRun(runId, {
        status: 'success',
        total_scraped: totalRowsProcessed,
        total_saved: totalImported
      });
    }

    return { totalImported, totalRowsProcessed };
  } catch (error) {
    logger.error('Supabase Bytbil import failed', { error: error.message });
    if (runId) {
      await updateScraperRun(runId, {
        status: 'failed',
        error_message: error.message
      });
    }
    throw error;
  }
}

export function startSupabaseBytbilImportJob() {
  const cronExpression = process.env.SUPABASE_BYTBIL_IMPORT_CRON || DEFAULT_CRON;
  logger.info('Starting Supabase Bytbil import job', { cronExpression });

  cron.schedule(cronExpression, async () => {
    try {
      await runSupabaseBytbilImportOnce();
    } catch (error) {
      logger.error('Error in scheduled Supabase Bytbil import', { error: error.message });
    }
  });

  // 1 fois au démarrage (à l'heure actuelle) — désactiver avec RUN_SUPABASE_BYTBIL_IMPORT_ON_STARTUP=false
  if (process.env.RUN_SUPABASE_BYTBIL_IMPORT_ON_STARTUP !== 'false') {
    setTimeout(async () => {
      try {
        await runSupabaseBytbilImportOnce();
      } catch (error) {
        logger.error('Error in initial Supabase Bytbil import', { error: error.message });
      }
    }, 5000);
  }
}
