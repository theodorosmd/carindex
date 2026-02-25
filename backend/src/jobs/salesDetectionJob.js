import cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { markAsSold } from '../services/saleDetector.js';

/**
 * Sales detection job
 * Detects listings that haven't been seen recently and marks them as sold
 * Runs every 6 hours
 */
export function startSalesDetectionJob() {
  logger.info('Starting sales detection job (runs every 6 hours)');

  // Schedule job to run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Sales detection job started');
    await detectAndMarkSales();
  }, {
    scheduled: true,
    timezone: 'Europe/Paris'
  });

  logger.info('Sales detection job scheduled successfully');
}

/**
 * Detect listings that disappeared and mark them as sold
 */
export async function detectAndMarkSales() {
  try {
    // Get listings that are still active but haven't been seen in the last 7 days
    // This indicates they were likely sold or removed
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days without update

    logger.info('Checking for disappeared listings', { cutoffDate: cutoffDate.toISOString() });

    // Get active listings that haven't been updated recently
    // Only check listings that were first seen at least 3 days ago (to avoid false positives)
    const minFirstSeenDate = new Date();
    minFirstSeenDate.setDate(minFirstSeenDate.getDate() - 3);

    const { data: disappearedListings, error } = await supabase
      .from('listings')
      .select('id, source_platform, source_listing_id, brand, model, price, last_seen, first_seen, created_at, location_country')
      .eq('status', 'active')
      .in('location_country', ['FR', 'SE']) // Only FR and SE
      .lt('last_seen', cutoffDate.toISOString())
      .lt('first_seen', minFirstSeenDate.toISOString())
      .not('price', 'is', null)
      .gt('price', 0)
      .limit(1000); // Process in batches

    // Log which sources are being checked
    if (disappearedListings && disappearedListings.length > 0) {
      const sourcesCount = {};
      disappearedListings.forEach(listing => {
        sourcesCount[listing.source_platform] = (sourcesCount[listing.source_platform] || 0) + 1;
      });
      logger.info('Checking disappeared listings by source', sourcesCount);
    }

    if (error) {
      throw new Error(`Failed to fetch disappeared listings: ${error.message}`);
    }

    if (!disappearedListings || disappearedListings.length === 0) {
      logger.info('No disappeared listings found');
      return {
        checked: 0,
        markedAsSold: 0,
        errors: 0
      };
    }

    logger.info(`Found ${disappearedListings.length} potentially sold listings`);

    const results = {
      checked: disappearedListings.length,
      markedAsSold: 0,
      errors: 0
    };

    // Mark each as sold
    for (const listing of disappearedListings) {
      try {
        // Use last_seen as sold_date (approximation)
        const soldDate = listing.last_seen || new Date().toISOString();
        
        await markAsSold(listing.id, soldDate);
        results.markedAsSold++;

        logger.debug('Marked listing as sold', {
          listingId: listing.id,
          brand: listing.brand,
          model: listing.model,
          soldDate
        });
      } catch (error) {
        logger.error('Error marking listing as sold', {
          listingId: listing.id,
          error: error.message
        });
        results.errors++;
      }
    }

    logger.info('Sales detection completed', results);
    return results;

  } catch (error) {
    logger.error('Error in sales detection job', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Manual trigger for sales detection (for testing or manual runs)
 */
export async function runSalesDetection() {
  logger.info('Manually triggering sales detection...');
  return await detectAndMarkSales();
}
