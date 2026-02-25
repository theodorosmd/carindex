#!/usr/bin/env node
/**
 * Import direct Django DB → Supabase (bypass HTTP API)
 *
 * Plus rapide que l'import via API : lit directement dans PostgreSQL Django.
 *
 * Prérequis :
 * - Accès réseau à la base PostgreSQL Django (même machine ou réseau)
 * - Le serveur Django mobile.de doit exposer le port 5432 ou un tunnel SSH
 *
 * Variables d'environnement (.env) :
 *   DJANGO_DB_HOST=75.119.141.234     # ou localhost si tunnel SSH
 *   DJANGO_DB_PORT=5432
 *   DJANGO_DB_NAME=parser_db          # nom de la base Django
 *   DJANGO_DB_USER=postgres
 *   DJANGO_DB_PASSWORD=xxx
 *
 * Optionnel :
 *   DJANGO_DB_TABLE=parser_app_car    # table des voitures (Django: app_model)
 *   DJANGO_DB_STATUS=OK               # importer seulement status='OK' (887k)
 *   DJANGO_DB_BATCH=1000              # taille des lots
 *   DJANGO_DB_LIMIT=0                 # 0 = pas de limite (tout importer)
 *
 * Lancer :
 *   node src/scripts/run-django-db-import-mobilede.js
 *
 * Dry-run (test sans écrire) :
 *   node src/scripts/run-django-db-import-mobilede.js --dry-run
 *
 * Limiter pour test :
 *   DJANGO_DB_LIMIT=1000 node src/scripts/run-django-db-import-mobilede.js
 */
import 'dotenv/config';
import pg from 'pg';
import { mapDjangoCarToListing } from '../jobs/djangoImportJob.js';
import { upsertListingsBatch } from '../services/ingestService.js';
import { logger } from '../utils/logger.js';

const { Client } = pg;

const DJANGO_DB_HOST = process.env.DJANGO_DB_HOST;
const DJANGO_DB_PORT = parseInt(process.env.DJANGO_DB_PORT || '5432', 10);
const DJANGO_DB_NAME = process.env.DJANGO_DB_NAME;
const DJANGO_DB_USER = process.env.DJANGO_DB_USER;
const DJANGO_DB_PASSWORD = process.env.DJANGO_DB_PASSWORD;
const DJANGO_DB_TABLE = process.env.DJANGO_DB_TABLE || 'parser_app_car';
const DJANGO_DB_STATUS = process.env.DJANGO_DB_STATUS || 'OK';
const BATCH_SIZE = parseInt(process.env.DJANGO_DB_BATCH || '1000', 10);
const LIMIT = parseInt(process.env.DJANGO_DB_LIMIT || '0', 10);
const DRY_RUN = process.argv.includes('--dry-run');

function safeJson(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch {
    return null;
  }
}

function rowToCar(row) {
  if (!row) return null;
  return {
    id: row.id,
    source_id: row.source_id ?? row.id,
    source: row.source ?? 'mobile_de',
    title: row.title,
    brand: row.brand,
    make: row.make,
    model: row.model,
    price: row.price,
    price_amount: row.price_amount ?? row.price,
    year: row.year,
    model_year: row.model_year,
    mileage: row.mileage,
    first_registration: row.first_registration,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    sold: row.sold,
    currency: row.currency,
    url: row.url ?? row.source_url ?? row.link,
    source_url: row.source_url,
    link: row.link,
    img_link: row.img_link ?? row.image,
    image: row.image,
    images: safeJson(row.images) || (row.img_link || row.image ? [row.img_link || row.image] : null),
    dealer_address: row.dealer_address,
    country: row.country,
    features: safeJson(row.features),
    dealer_phones: safeJson(row.dealer_phones),
    hu_until_date: row.hu_until_date,
    hu_until_raw: row.hu_until_raw,
    reg_number: row.reg_number,
    status_code: row.status_code
  };
}

async function main() {
  if (!DJANGO_DB_HOST || !DJANGO_DB_NAME || !DJANGO_DB_USER) {
    logger.error('Missing Django DB config. Set DJANGO_DB_HOST, DJANGO_DB_NAME, DJANGO_DB_USER (and DJANGO_DB_PASSWORD if required) in .env');
    process.exit(1);
  }

  if (DRY_RUN) {
    logger.info('DRY RUN - no writes to Supabase');
  }

  const client = new Client({
    host: DJANGO_DB_HOST,
    port: DJANGO_DB_PORT,
    database: DJANGO_DB_NAME,
    user: DJANGO_DB_USER,
    password: DJANGO_DB_PASSWORD
  });

  try {
    await client.connect();
    logger.info('Connected to Django DB', { host: DJANGO_DB_HOST, database: DJANGO_DB_NAME });

    const statusFilter = DJANGO_DB_STATUS ? `AND status = $1` : '';
    const statusParam = DJANGO_DB_STATUS || null;

    const countRes = await client.query(
      `SELECT COUNT(*) as total FROM ${DJANGO_DB_TABLE} WHERE 1=1 ${statusFilter}`,
      statusParam ? [statusParam] : []
    );
    const totalRows = parseInt(countRes.rows[0]?.total || '0', 10);
    logger.info('Rows to import', { total: totalRows, status: DJANGO_DB_STATUS || 'all', limit: LIMIT || 'none' });

    const effectiveLimit = LIMIT > 0 ? Math.min(LIMIT, totalRows) : totalRows;
    if (effectiveLimit === 0) {
      logger.info('Nothing to import');
      process.exit(0);
    }

    let lastId = 0;
    let imported = 0;
    let errors = 0;
    const startTime = Date.now();

    while (true) {
      const params = statusParam ? [statusParam, lastId, BATCH_SIZE] : [lastId, BATCH_SIZE];

      const res = await client.query(
        `SELECT * FROM ${DJANGO_DB_TABLE}
         WHERE id > $${statusParam ? 2 : 1} ${statusFilter}
         ORDER BY id
         LIMIT $${statusParam ? 3 : 2}`,
        params
      );

      const rows = res.rows;
      if (rows.length === 0) break;

      lastId = rows[rows.length - 1].id;

      const cars = rows.map(rowToCar).filter(Boolean);
      const listings = cars.map((c) => mapDjangoCarToListing(c, { sourceOverride: 'mobile_de' }));

      if (!DRY_RUN && listings.length > 0) {
        const result = await upsertListingsBatch(listings, {
          allowMissingRequired: true,
          useBulkUpsert: true
        });
        imported += result.updated + result.created;
        errors += result.errors || 0;
      } else if (DRY_RUN) {
        imported += listings.length;
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = imported > 0 ? Math.round(imported / (elapsed / 60)) : 0;
      logger.info(`Progress: ${imported}/${effectiveLimit} rows, ${rate}/min, ${elapsed}s elapsed`);

      if (imported >= effectiveLimit) break;
      if (rows.length < BATCH_SIZE) break;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    logger.info('Import completed', {
      imported,
      errors,
      elapsedSec: elapsed,
      ratePerMin: imported > 0 ? Math.round(imported / (elapsed / 60)) : 0,
      dryRun: DRY_RUN
    });
  } catch (err) {
    logger.error('Django DB import failed', { error: err.message });
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

main();
