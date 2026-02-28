#!/usr/bin/env node

import { runLeBonCoinScraper } from '../services/leboncoinService.js';

/**
 * Test script for LeBonCoin scraper (via scrape.do)
 * Usage: node backend/src/scripts/test-leboncoin-scraper.js
 *
 * Requires SCRAPE_DO_TOKEN in .env
 */
async function testLeBonCoinScraper() {
  try {
    console.log('Testing LeBonCoin scraper (via scrape.do)...\n');

    const testUrls = ['https://www.leboncoin.fr/c/voitures'];

    const result = await runLeBonCoinScraper(testUrls, {
      maxPages: 3,
    });

    console.log('\nScraper completed!');
    console.log('Results:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.message.includes('SCRAPE_DO_TOKEN')) {
      console.log('\nSign up at https://scrape.do to get a free token (1000 credits)');
      console.log('Then add it to .env: SCRAPE_DO_TOKEN=your-token-here');
    }
    process.exit(1);
  }
}

testLeBonCoinScraper();
