#!/usr/bin/env node
/**
 * Test du flux Ingest : raw → processRawListings → listings
 *
 * Vérifie que :
 * 1. saveRawListings écrit dans raw_listings
 * 2. processRawListings mappe et upsert dans listings
 *
 * Usage: node src/scripts/test-ingest-flow.js
 * Prérequis: .env avec SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import 'dotenv/config';
import { saveRawListings } from '../services/rawIngestService.js';
import { processRawListings } from '../services/rawListingsProcessorService.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const TEST_SOURCE_ID = `test-${Date.now()}`;

const SAMPLE_RAW = {
  ad_id: TEST_SOURCE_ID,
  url: `https://suchen.mobile.de/fahrzeuge/details/${TEST_SOURCE_ID}.html`,
  title: 'VW Golf 1.4 TSI',
  make: 'Volkswagen',
  model: 'Golf',
  price_amount: 18500,
  currency: 'EUR',
  mileage: 45000,
  first_registration: '03/2019',
  fuel_type: 'Benzin',
  transmission: 'Schaltgetriebe',
  city: 'Berlin',
  country: 'DE',
  seller_type: 'DEALER',
  engine_size: 1395,
  power: 110,
  doors: '5',
  images: [
    'https://example.com/car1.jpg',
    'https://example.com/car2.jpg'
  ],
  features: []
};

async function main() {
  logger.info('=== Test Ingest Flow ===');

  // Nettoyer anciens tests
  await supabase.from('raw_listings').delete().like('source_listing_id', 'test-%');
  await supabase.from('listings').delete().eq('source_platform', 'mobile_de').like('source_listing_id', 'test-%');
  // Small delay to ensure delete is applied
  await new Promise((r) => setTimeout(r, 200));

  // 1. Sauver dans raw_listings
  logger.info('1. saveRawListings...');
  const { saved, errors } = await saveRawListings([SAMPLE_RAW], 'mobile_de');
  if (saved < 1) {
    logger.error('Échec saveRawListings', { saved, errors });
    process.exit(1);
  }
  logger.info('   OK: raw_listings', { saved });

  // 2. Traiter raw → listings
  logger.info('2. processRawListings...');
  const result = await processRawListings({ limit: 100, sourcePlatform: 'mobile_de' });
  logger.info('   OK:', result);

  // 3. Vérifier listing
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, source_platform, source_listing_id, brand, model, price')
    .eq('source_platform', 'mobile_de')
    .eq('source_listing_id', TEST_SOURCE_ID);

  if (error) {
    logger.error('Erreur lecture listings', error);
    process.exit(1);
  }

  if (!listings || listings.length === 0) {
    logger.error('Listing non trouvé après processRawListings');
    process.exit(1);
  }

  logger.info('3. Listing trouvé:', listings[0]);
  logger.info('=== Test OK ===');
  process.exit(0);
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
