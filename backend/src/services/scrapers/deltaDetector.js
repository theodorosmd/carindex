import { supabase } from '../../config/supabase.js';
import { logger } from '../../utils/logger.js';

/**
 * Detect changes between current scraping run and previous state
 * Returns: new listings, price changes, disappeared listings
 */
export async function detectDelta(runId, source, currentListings) {
  try {
    logger.info('Starting delta detection', { runId, source, currentCount: currentListings.length });

    // Get current listing IDs from database for this source
    const { data: existingListings, error: fetchError } = await supabase
      .from('listings')
      .select('id, source_listing_id, price, status')
      .eq('source_platform', source)
      .in('status', ['active', 'pending']);

    if (fetchError) {
      throw new Error(`Failed to fetch existing listings: ${fetchError.message}`);
    }

    // Create maps for quick lookup
    const existingById = new Map();
    const existingBySourceId = new Map();
    
    (existingListings || []).forEach(listing => {
      existingById.set(listing.id, listing);
      if (listing.source_listing_id) {
        existingBySourceId.set(listing.source_listing_id, listing);
      }
    });

    // Process current listings
    const newListings = [];
    const priceChanges = [];
    const unchangedListings = [];
    const currentSourceIds = new Set();

    for (const current of currentListings) {
      const sourceId = current.source_listing_id || current.id;
      currentSourceIds.add(sourceId);

      if (!sourceId) {
        logger.warn('Listing without source_listing_id', { listing: current });
        continue;
      }

      const existing = existingBySourceId.get(sourceId);

      if (!existing) {
        // New listing
        newListings.push({
          ...current,
          source_listing_id: sourceId,
          isNew: true
        });
      } else {
        const currentPrice = parseFloat(current.price || 0);
        const existingPrice = parseFloat(existing.price || 0);

        if (currentPrice > 0 && existingPrice > 0 && currentPrice !== existingPrice) {
          // Price changed
          const dropAmount = existingPrice - currentPrice;
          const dropPct = existingPrice > 0 ? (dropAmount / existingPrice) * 100 : 0;

          priceChanges.push({
            listingId: existing.id,
            sourceListingId: sourceId,
            oldPrice: existingPrice,
            newPrice: currentPrice,
            dropAmount: dropAmount > 0 ? dropAmount : 0,
            dropPct: dropPct > 0 ? dropPct : 0,
            isIncrease: dropAmount < 0
          });
        } else {
          // Unchanged
          unchangedListings.push({
            listingId: existing.id,
            sourceListingId: sourceId
          });
        }
      }
    }

    // Find disappeared listings (present before but not in current run)
    const disappearedListings = [];
    for (const [sourceId, existing] of existingBySourceId.entries()) {
      if (!currentSourceIds.has(sourceId) && existing.status === 'active') {
        disappearedListings.push({
          listingId: existing.id,
          sourceListingId: sourceId,
          lastPrice: parseFloat(existing.price || 0)
        });
      }
    }

    logger.info('Delta detection completed', {
      runId,
      source,
      newListings: newListings.length,
      priceChanges: priceChanges.length,
      disappearedListings: disappearedListings.length,
      unchangedListings: unchangedListings.length
    });

    return {
      newListings,
      priceChanges,
      disappearedListings,
      unchangedListings,
      stats: {
        totalCurrent: currentListings.length,
        totalExisting: existingListings?.length || 0,
        newCount: newListings.length,
        priceChangeCount: priceChanges.length,
        disappearedCount: disappearedListings.length,
        unchangedCount: unchangedListings.length
      }
    };
  } catch (error) {
    logger.error('Error in delta detection', { error: error.message, runId, source });
    throw error;
  }
}

/**
 * Process a new scraping run and detect all changes
 */
export async function processNewRun(runId, source, listings) {
  try {
    const delta = await detectDelta(runId, source, listings);
    
    return {
      success: true,
      runId,
      source,
      delta,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error processing new run', { error: error.message, runId, source });
    throw error;
  }
}
