#!/usr/bin/env node
/**
 * Test: ajouter des URLs à la queue mobile.de
 * Usage: INGEST_API_KEY=xxx node src/scripts/test-queue-add.js
 */
import 'dotenv/config';
import { addToQueue } from '../services/mobileDeQueueService.js';

const TEST_URLS = [
  { url: 'https://suchen.mobile.de/fahrzeuge/details/test-queue-1.html', title: 'Test Car 1' },
  { url: 'https://suchen.mobile.de/fahrzeuge/details/test-queue-2.html', title: 'Test Car 2' },
];

async function main() {
  const result = await addToQueue(TEST_URLS);
  console.log('Queue add result:', result);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
