import dotenv from 'dotenv';
import { runGaspedaalScraper } from '../services/gaspedaalService.js';

dotenv.config();

/**
 * Test script for Gaspedaal.nl scraper
 * Usage: node backend/src/scripts/test-gaspedaal-scraper.js
 */
async function testGaspedaalScraper() {
  try {
    console.log('Testing Gaspedaal.nl scraper...\n');

    const testUrls = [
      'https://www.gaspedaal.nl/zoeken?srt=df-a'
    ];

    console.log('Testing URLs:', testUrls);
    console.log('');

    const result = await runGaspedaalScraper(testUrls, {
      maxPages: 1
    });

    console.log('\nScraper completed!');
    console.log('Results:', {
      totalScraped: result.totalScraped,
      saved: result.saved,
      processedUrls: result.processedUrls
    });

    if (result.totalScraped === 0) {
      console.log('\nNo listings found. This could mean:');
      console.log('  1. The page structure has changed');
      console.log('  2. Gaspedaal.nl is blocking the scraper');
      console.log('  3. The selectors need to be updated');
      console.log('\nCheck the logs above for debug information.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\nError testing Gaspedaal scraper:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGaspedaalScraper();
