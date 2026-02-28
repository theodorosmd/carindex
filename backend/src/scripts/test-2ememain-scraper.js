/**
 * Test 2ememain.be scraper
 * Usage: node backend/src/scripts/test-2ememain-scraper.js
 * Requires: SCRAPE_DO_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { run2ememainScraper } from '../services/deuxememainService.js';

async function main() {
  console.log('Testing 2ememain.be scraper...\n');

  const url = 'https://www.2ememain.be/l/autos/#f:10882';

  try {
    const result = await run2ememainScraper([url], {
      maxPages: 1
    });

    console.log('\n✅ Result:', result);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
