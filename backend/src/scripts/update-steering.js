import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { clearFacetsCache } from '../services/facetsService.js';

/**
 * Update existing listings with steering value based on country
 * RHD countries: GB, UK, IE, MT, CY
 * LHD for most other European countries
 */
async function updateSteeringForExistingListings() {
  try {
    logger.info('Starting steering update for existing listings');

    // RHD countries (Right-Hand Drive)
    const rhdCountries = ['GB', 'UK', 'IE', 'MT', 'CY'];
    
    // Get all listings without steering
    const { data: listings, error: fetchError } = await supabase
      .from('listings')
      .select('id, location_country, steering')
      .or('steering.is.null,steering.eq.')
      .limit(10000); // Process in batches

    if (fetchError) {
      logger.error('Error fetching listings', fetchError);
      throw fetchError;
    }

    logger.info(`Found ${listings?.length || 0} listings without steering`);

    if (!listings || listings.length === 0) {
      logger.info('No listings to update');
      return { updated: 0 };
    }

    let updatedCount = 0;
    const updates = [];

    for (const listing of listings) {
      const country = listing.location_country;
      let steering = null;

      if (country) {
        if (rhdCountries.includes(country.toUpperCase())) {
          steering = 'RHD';
        } else {
          // Most European countries are LHD
          steering = 'LHD';
        }
      }

      if (steering) {
        updates.push({
          id: listing.id,
          steering
        });
      }
    }

    logger.info(`Prepared ${updates.length} updates`);

    // Group updates by steering value for batch updates
    const updatesBySteering = {};
    updates.forEach(update => {
      if (!updatesBySteering[update.steering]) {
        updatesBySteering[update.steering] = [];
      }
      updatesBySteering[update.steering].push(update.id);
    });

    // Update in batches by steering value
    for (const [steering, ids] of Object.entries(updatesBySteering)) {
      const batchSize = 500; // Supabase can handle larger batches
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        
        const { error: updateError } = await supabase
          .from('listings')
          .update({ steering })
          .in('id', batch);

        if (updateError) {
          logger.error(`Error updating batch for ${steering}`, updateError);
        } else {
          updatedCount += batch.length;
          logger.info(`Updated ${updatedCount} / ${updates.length} listings (${steering})`);
        }
      }
    }

    logger.info(`Successfully updated ${updatedCount} listings with steering values`);
    
    // Clear facets cache so new counts are calculated
    if (updatedCount > 0) {
      clearFacetsCache();
      logger.info('Facets cache cleared to refresh steering counts');
    }
    
    return { updated: updatedCount };
  } catch (error) {
    logger.error('Error updating steering for listings', error);
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('update-steering.js');

if (isMainModule) {
  updateSteeringForExistingListings()
    .then((result) => {
      console.log('✅ Update completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
}

export { updateSteeringForExistingListings };

