import dotenv from 'dotenv';
import { runBlocketScraper } from '../services/blocketService.js';
import { logger } from '../utils/logger.js';

dotenv.config();

/**
 * Test script for Blocket.se scraper
 * Usage: node backend/src/scripts/test-blocket-scraper.js
 */
async function testBlocketScraper() {
  try {
    console.log('🧪 Testing Blocket.se scraper...\n');

    // Test with simple URL
    const testUrls = [
      'https://www.blocket.se/annonser/hela_sverige/fordon/bilar',
      // Alternative URL format
      // 'https://www.blocket.se/mobility/search/car'
    ];

    console.log('Testing URLs:', testUrls);
    console.log('');

    const result = await runBlocketScraper(testUrls, {
      maxPages: 1, // Just test first page
      resultLimitPerThread: 10
    });

    console.log('\n✅ Scraper completed!');
    console.log('Results:', {
      totalScraped: result.totalScraped,
      saved: result.saved,
      errors: result.errors,
      processedUrls: result.processedUrls
    });

    if (result.totalScraped === 0) {
      console.log('\n⚠️  No listings found. This could mean:');
      console.log('  1. The page structure has changed');
      console.log('  2. Blocket.se is blocking the scraper');
      console.log('  3. The selectors need to be updated');
      console.log('\nCheck the logs above for debug information.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error testing Blocket scraper:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testBlocketScraper();
