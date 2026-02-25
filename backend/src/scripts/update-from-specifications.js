import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { clearFacetsCache } from '../services/facetsService.js';

/**
 * Normalize fuel type
 */
function normalizeFuelType(fuelType) {
  if (!fuelType) return null;
  
  const normalized = fuelType.toLowerCase();
  if (normalized.includes('diesel')) return 'diesel';
  if (normalized.includes('petrol') || normalized.includes('essence') || normalized.includes('gasoline')) return 'petrol';
  if (normalized.includes('hybrid')) return 'hybrid';
  if (normalized.includes('electric') || normalized.includes('électrique')) return 'electric';
  
  return fuelType.toLowerCase();
}

/**
 * Normalize transmission type
 */
function normalizeTransmission(transmission) {
  if (!transmission) return null;
  
  const normalized = transmission.toLowerCase();
  if (normalized.includes('automatic') || normalized.includes('automatique')) return 'automatic';
  if (normalized.includes('manual') || normalized.includes('manuelle')) return 'manual';
  
  return transmission.toLowerCase();
}

/**
 * Extract power in HP from various formats
 */
function extractPowerHp(powerValue) {
  if (!powerValue) return null;
  
  let powerHp = null;
  if (typeof powerValue === 'string') {
    // Extract number from "140 kW" or "140 kW (190 PS)" format
    const kwMatch = powerValue.match(/(\d+(?:\.\d+)?)\s*kw/i);
    if (kwMatch) {
      // Convert kW to HP: 1 kW ≈ 1.36 HP
      powerHp = Math.round(parseFloat(kwMatch[1]) * 1.36);
    } else {
      // Try to extract HP directly from "190 PS" or "190 HP" format
      const hpMatch = powerValue.match(/(\d+)\s*(?:ps|hp)/i);
      if (hpMatch) {
        powerHp = parseInt(hpMatch[1]);
      } else {
        // Try to parse as direct number
        const numMatch = powerValue.match(/(\d+)/);
        if (numMatch) {
          powerHp = parseInt(numMatch[1]);
        }
      }
    }
  } else if (typeof powerValue === 'number') {
    // If already a number, assume it's in kW and convert
    powerHp = Math.round(powerValue * 1.36);
  }
  
  return powerHp;
}

/**
 * Extract data from specifications object
 */
function extractFromSpecifications(specs) {
  if (!specs || typeof specs !== 'object') {
    return { fuel_type: null, transmission: null, doors: null, power_hp: null };
  }

  // Extract fuel type - check capitalized keys first (AutoScout24 format)
  const fuelType = normalizeFuelType(
    specs.Fuel || 
    specs.fuelType || 
    specs.fuel || 
    specs.energy ||
    specs.engineType
  );

  // Extract transmission - check capitalized keys first
  const transmission = normalizeTransmission(
    specs.Transmission || 
    specs.transmission || 
    specs.gearbox ||
    specs.gearType
  );

  // Extract doors - check "Door Count" (AutoScout24 format)
  let doorsValue = specs['Door Count'] || 
    specs.doors || 
    specs.numberOfDoors ||
    specs.Doors ||
    null;
  
  const doors = typeof doorsValue === 'number' ? doorsValue : (parseInt(doorsValue) || null);

  // Extract power - check "Power" (AutoScout24 format: "140 kW")
  const powerValue = specs.Power || 
    specs.power || 
    specs.horsepower || 
    specs.powerHP ||
    null;
  
  const powerHp = extractPowerHp(powerValue);

  return {
    fuel_type: fuelType,
    transmission,
    doors,
    power_hp: powerHp
  };
}

/**
 * Update existing listings with data extracted from specifications
 */
async function updateListingsFromSpecifications() {
  try {
    logger.info('Starting update from specifications for existing listings');

    // Fetch listings that have specifications but missing fuel_type, transmission, doors, or power_hp
    const { data: listingsToUpdate, error: fetchError } = await supabase
      .from('listings')
      .select('id, specifications, fuel_type, transmission, doors, power_hp')
      .not('specifications', 'is', null)
      .or('fuel_type.is.null,transmission.is.null,doors.is.null,power_hp.is.null')
      .limit(100000);

    if (fetchError) {
      logger.error('Error fetching listings for update', fetchError);
      throw fetchError;
    }

    logger.info(`Found ${listingsToUpdate?.length || 0} listings to process`);

    if (!listingsToUpdate || listingsToUpdate.length === 0) {
      logger.info('No listings to update from specifications');
      return { updated: 0 };
    }

    const updates = [];
    let updatedCount = 0;

    for (const listing of listingsToUpdate) {
      const extracted = extractFromSpecifications(listing.specifications);
      
      // Only update fields that are currently null and have been extracted
      const updateData = {};
      if (!listing.fuel_type && extracted.fuel_type) {
        updateData.fuel_type = extracted.fuel_type;
      }
      if (!listing.transmission && extracted.transmission) {
        updateData.transmission = extracted.transmission;
      }
      if (!listing.doors && extracted.doors) {
        updateData.doors = extracted.doors;
      }
      if (!listing.power_hp && extracted.power_hp) {
        updateData.power_hp = extracted.power_hp;
      }

      // Only add to updates if at least one field was extracted
      if (Object.keys(updateData).length > 0) {
        updates.push({ id: listing.id, ...updateData });
      }
    }

    logger.info(`Prepared ${updates.length} updates from specifications`);

    // Update listings in batches
    const batchSize = 1000;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      // Update each listing individually (Supabase doesn't support batch updates with different fields)
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

      logger.info(`Updated ${updatedCount} / ${updates.length} listings from specifications`);
    }

    logger.info(`Successfully updated ${updatedCount} listings with data from specifications`);
    
    // Clear facets cache after updating listings
    clearFacetsCache();
    logger.info('Facets cache cleared');

    return { updated: updatedCount };
  } catch (error) {
    logger.error('Error updating listings from specifications', error);
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('update-from-specifications.js');

if (isMainModule) {
  updateListingsFromSpecifications()
    .then((result) => {
      console.log('✅ Update completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
}

export { updateListingsFromSpecifications };







