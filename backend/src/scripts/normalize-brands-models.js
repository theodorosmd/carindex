import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Normalize existing brand and model values to lowercase
 * This ensures consistency with the search filters
 */
async function normalizeBrandsAndModels() {
  try {
    logger.info('Starting brand and model normalization');

    // Get all listings
    const { data: listings, error: fetchError } = await supabase
      .from('listings')
      .select('id, brand, model')
      .limit(10000); // Process in batches

    if (fetchError) {
      logger.error('Error fetching listings', fetchError);
      throw fetchError;
    }

    logger.info(`Found ${listings?.length || 0} listings to check`);

    if (!listings || listings.length === 0) {
      logger.info('No listings to update');
      return { updated: 0 };
    }

    const updates = [];

    for (const listing of listings) {
      const needsUpdate = {};
      
      // Normalize brand if needed
      if (listing.brand && listing.brand !== listing.brand.toLowerCase()) {
        needsUpdate.brand = listing.brand.toLowerCase();
      }
      
      // Normalize model if needed
      if (listing.model && listing.model !== listing.model.toLowerCase()) {
        needsUpdate.model = listing.model.toLowerCase();
      }

      if (Object.keys(needsUpdate).length > 0) {
        updates.push({
          id: listing.id,
          ...needsUpdate
        });
      }
    }

    logger.info(`Prepared ${updates.length} updates`);

    if (updates.length === 0) {
      logger.info('No listings need normalization');
      return { updated: 0 };
    }

    let updatedCount = 0;

    // Update in batches of 500
    const batchSize = 500;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { id, ...updateData } = update;
        const { error: updateError } = await supabase
          .from('listings')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          logger.error(`Error updating listing ${id}`, updateError);
        } else {
          updatedCount++;
        }
      }

      logger.info(`Updated ${Math.min(i + batchSize, updates.length)} / ${updates.length} listings`);
    }

    logger.info(`Successfully normalized ${updatedCount} listings`);
    
    return { updated: updatedCount };
  } catch (error) {
    logger.error('Error normalizing brands and models', error);
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('normalize-brands-models.js');

if (isMainModule) {
  normalizeBrandsAndModels()
    .then((result) => {
      console.log('✅ Normalization completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Normalization failed:', error);
      process.exit(1);
    });
}

export { normalizeBrandsAndModels };







