import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { facetsCache } from '../utils/cache.js';

/**
 * Clear facets cache (useful for debugging or after data updates)
 */
export function clearFacetsCache() {
  facetsCache.clear();
  logger.info('Facets cache cleared');
}

/**
 * Get facet counts for filters based on current search criteria
 * This allows dynamic filter counts that update based on other selected filters
 * Uses caching to improve performance
 */
export async function getFacetsService(baseFilters = {}) {
  try {
    // Check cache first (but with shorter TTL for now to debug)
    const cacheKey = facetsCache.generateKey('facets', baseFilters);
    const cached = facetsCache.get(cacheKey);
    if (cached) {
      logger.info('Facets: Returning cached result', { cacheKey, total: cached.total });
      return cached;
    }
    
    logger.info('Facets: Computing fresh facets', { baseFilters });

    // Use SQL aggregation for accurate counts - much more efficient than loading all data
    // Build WHERE clause conditions
    const conditions = ['status = \'active\''];
    const params = [];
    let paramIndex = 1;
    
    if (baseFilters.brand) {
      const brands = Array.isArray(baseFilters.brand) ? baseFilters.brand : [baseFilters.brand];
      const brandValues = brands.map(b => `'${b.toLowerCase().replace(/'/g, "''")}'`).join(',');
      conditions.push(`brand IN (${brandValues})`);
    }
    
    if (baseFilters.min_price) {
      conditions.push(`price >= ${parseInt(baseFilters.min_price)}`);
    }
    
    if (baseFilters.max_price) {
      conditions.push(`price <= ${parseInt(baseFilters.max_price)}`);
    }
    
    if (baseFilters.min_year) {
      conditions.push(`year >= ${parseInt(baseFilters.min_year)}`);
    }
    
    if (baseFilters.max_year) {
      conditions.push(`year <= ${parseInt(baseFilters.max_year)}`);
    }
    
    if (baseFilters.min_mileage) {
      conditions.push(`mileage >= ${parseInt(baseFilters.min_mileage)}`);
    }
    
    if (baseFilters.max_mileage) {
      conditions.push(`mileage <= ${parseInt(baseFilters.max_mileage)}`);
    }
    
    if (baseFilters.country) {
      conditions.push(`location_country = '${baseFilters.country.replace(/'/g, "''")}'`);
    }
    
    if (baseFilters.fuel_type) {
      const fuels = Array.isArray(baseFilters.fuel_type) ? baseFilters.fuel_type : [baseFilters.fuel_type];
      const fuelValues = fuels.map(f => `'${f.replace(/'/g, "''")}'`).join(',');
      conditions.push(`fuel_type IN (${fuelValues})`);
    }
    
    if (baseFilters.seller_type) {
      const sellerTypes = Array.isArray(baseFilters.seller_type) ? baseFilters.seller_type : [baseFilters.seller_type];
      const sellerTypeMap = {
        'particulier': 'private',
        'professionnel': 'professional'
      };
      const mappedTypes = sellerTypes.map(s => sellerTypeMap[s] || s);
      const typeValues = mappedTypes.map(t => `'${t.replace(/'/g, "''")}'`).join(',');
      conditions.push(`seller_type IN (${typeValues})`);
    }
    
    // For now, use the method that loads all listings and aggregates in memory
    // TODO: Implement RPC functions in Supabase for better performance with SQL aggregation
    const selectColumns = 'brand, model, fuel_type, transmission, steering, doors, seller_type, color, category, drivetrain, version, trim';
    
    // Build base query with filters (same as search, but without pagination)
    // Remove limit to get accurate counts - but this may be slow for very large datasets
    let query = supabase
      .from('listings')
      .select(selectColumns, { count: 'exact' })
      .eq('status', 'active');

    // Apply base filters (same logic as searchListingsService)
    if (baseFilters.brand) {
      const brands = Array.isArray(baseFilters.brand) ? baseFilters.brand : [baseFilters.brand];
      query = query.in('brand', brands.map(b => b.toLowerCase()));
    }

    if (baseFilters.min_price) {
      query = query.gte('price', baseFilters.min_price);
    }

    if (baseFilters.max_price) {
      query = query.lte('price', baseFilters.max_price);
    }

    if (baseFilters.min_year) {
      query = query.gte('year', baseFilters.min_year);
    }

    if (baseFilters.max_year) {
      query = query.lte('year', baseFilters.max_year);
    }

    if (baseFilters.min_mileage) {
      query = query.gte('mileage', baseFilters.min_mileage);
    }

    if (baseFilters.max_mileage) {
      query = query.lte('mileage', baseFilters.max_mileage);
    }

    if (baseFilters.country) {
      query = query.eq('location_country', baseFilters.country);
    }

    if (baseFilters.fuel_type) {
      const fuels = Array.isArray(baseFilters.fuel_type) ? baseFilters.fuel_type : [baseFilters.fuel_type];
      query = query.in('fuel_type', fuels);
    }

    if (baseFilters.seller_type) {
      const sellerTypes = Array.isArray(baseFilters.seller_type) ? baseFilters.seller_type : [baseFilters.seller_type];
      query = query.in('seller_type', sellerTypes);
    }

    // Get total count first - create a separate count query
    let countQuery = supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Apply same filters to count query
    if (baseFilters.brand) {
      const brands = Array.isArray(baseFilters.brand) ? baseFilters.brand : [baseFilters.brand];
      countQuery = countQuery.in('brand', brands.map(b => b.toLowerCase()));
    }

    if (baseFilters.min_price) {
      countQuery = countQuery.gte('price', baseFilters.min_price);
    }

    if (baseFilters.max_price) {
      countQuery = countQuery.lte('price', baseFilters.max_price);
    }

    if (baseFilters.min_year) {
      countQuery = countQuery.gte('year', baseFilters.min_year);
    }

    if (baseFilters.max_year) {
      countQuery = countQuery.lte('year', baseFilters.max_year);
    }

    if (baseFilters.min_mileage) {
      countQuery = countQuery.gte('mileage', baseFilters.min_mileage);
    }

    if (baseFilters.max_mileage) {
      countQuery = countQuery.lte('mileage', baseFilters.max_mileage);
    }

    if (baseFilters.country) {
      countQuery = countQuery.eq('location_country', baseFilters.country);
    }

    if (baseFilters.fuel_type) {
      const fuels = Array.isArray(baseFilters.fuel_type) ? baseFilters.fuel_type : [baseFilters.fuel_type];
      countQuery = countQuery.in('fuel_type', fuels);
    }

    if (baseFilters.seller_type) {
      const sellerTypes = Array.isArray(baseFilters.seller_type) ? baseFilters.seller_type : [baseFilters.seller_type];
      countQuery = countQuery.in('seller_type', sellerTypes);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      logger.error('Error getting total count for facets', countError);
      throw countError;
    }

    // For facets, we need to aggregate by each field
    // Instead of loading all data, we'll use multiple queries with distinct values
    // This is more efficient for large datasets
    
    // Get all matching listings for aggregation - use pagination to fetch all results
    let allListings = [];
    let offset = 0;
    const pageSize = 10000; // Fetch in batches
    let hasMore = true;

    while (hasMore) {
      const { data: listings, error } = await query
        .range(offset, offset + pageSize - 1);

      if (error) {
        logger.error('Error fetching listings for facets', error);
        throw error;
      }

      if (listings && listings.length > 0) {
        allListings = allListings.concat(listings);
        offset += listings.length;
        
        // If we got less than pageSize, we've reached the end
        if (listings.length < pageSize) {
          hasMore = false;
        }
        
        // Also check if we have the total count
        if (totalCount !== null && totalCount !== undefined) {
          if (allListings.length >= totalCount) {
            hasMore = false;
          }
        }
      } else {
        hasMore = false;
      }
      
      // Safety limit: don't fetch more than 1 million records for facets
      if (allListings.length >= 1000000) {
        logger.warn('Facets: Reached safety limit of 1M records, using sample for counts');
        hasMore = false;
      }
    }

    const listings = allListings;
    
    logger.info('Facets: Loaded listings for aggregation', { 
      count: listings.length, 
      totalCount 
    });

    // Calculate facets
    const facets = {
      brands: {},
      models: {},
      fuel_types: {},
      transmissions: {},
      steering: {},
      doors: {},
      seller_types: {},
      colors: {},
      categories: {},
      drivetrains: {},
      versions: {},
      trims: {}
    };

    (listings || []).forEach(listing => {
      // Brands
      if (listing.brand) {
        facets.brands[listing.brand] = (facets.brands[listing.brand] || 0) + 1;
      }

      // Models
      if (listing.model) {
        const key = `${listing.brand} ${listing.model}`;
        facets.models[key] = (facets.models[key] || 0) + 1;
      }

      // Fuel types - only count non-null, non-empty values
      if (listing.fuel_type && listing.fuel_type.trim() !== '') {
        facets.fuel_types[listing.fuel_type] = (facets.fuel_types[listing.fuel_type] || 0) + 1;
      }

      // Transmissions - only count non-null, non-empty values
      if (listing.transmission && listing.transmission.trim() !== '') {
        facets.transmissions[listing.transmission] = (facets.transmissions[listing.transmission] || 0) + 1;
      }

      // Steering - only count non-null, non-empty values
      if (listing.steering && listing.steering.trim() !== '') {
        facets.steering[listing.steering] = (facets.steering[listing.steering] || 0) + 1;
      }

      // Doors - only count non-null values
      if (listing.doors && listing.doors > 0) {
        facets.doors[listing.doors] = (facets.doors[listing.doors] || 0) + 1;
      }

      // Seller types
      if (listing.seller_type) {
        facets.seller_types[listing.seller_type] = (facets.seller_types[listing.seller_type] || 0) + 1;
      }

      // Colors
      if (listing.color) {
        facets.colors[listing.color] = (facets.colors[listing.color] || 0) + 1;
      }

      // Categories - only count non-null, non-empty values
      if (listing.category && listing.category.trim() !== '') {
        facets.categories[listing.category] = (facets.categories[listing.category] || 0) + 1;
      }

      // Drivetrains - only count non-null, non-empty values
      if (listing.drivetrain && listing.drivetrain.trim() !== '') {
        facets.drivetrains[listing.drivetrain] = (facets.drivetrains[listing.drivetrain] || 0) + 1;
      }

      // Versions - only count non-null, non-empty values
      if (listing.version && listing.version.trim() !== '') {
        facets.versions[listing.version] = (facets.versions[listing.version] || 0) + 1;
      }

      // Trims (finition) - only count non-null, non-empty values
      if (listing.trim && listing.trim.trim() !== '') {
        facets.trims[listing.trim] = (facets.trims[listing.trim] || 0) + 1;
      }
    });

    // Format response
    const result = {
      total: totalCount || listings?.length || 0,
      facets: {
        brands: Object.entries(facets.brands)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        models: Object.entries(facets.models)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        fuel_types: Object.entries(facets.fuel_types)
          .filter(([name]) => name && name.trim() !== '') // Filter out empty/null names
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        transmissions: Object.entries(facets.transmissions)
          .filter(([name]) => name && name.trim() !== '') // Filter out empty/null names
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        steering: Object.entries(facets.steering)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        doors: Object.entries(facets.doors)
          .map(([name, count]) => ({ name: `${name} portes`, count }))
          .sort((a, b) => b.count - a.count),
        seller_types: Object.entries(facets.seller_types)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        colors: Object.entries(facets.colors)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        categories: Object.entries(facets.categories)
          .filter(([name]) => name && name.trim() !== '') // Filter out empty/null names
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        drivetrains: Object.entries(facets.drivetrains)
          .filter(([name]) => name && name.trim() !== '') // Filter out empty/null names
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        versions: Object.entries(facets.versions)
          .filter(([name]) => name && name.trim() !== '') // Filter out empty/null names
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        trims: Object.entries(facets.trims)
          .filter(([name]) => name && name.trim() !== '') // Filter out empty/null names
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      }
    };
    
    // Cache the result
    facetsCache.set(cacheKey, result);
    
    logger.info('Facets: Computed facets', { 
      total: result.total,
      brandsCount: result.facets.brands.length,
      sampleBrands: result.facets.brands.slice(0, 5).map(b => `${b.name} (${b.count})`)
    });
    
    return result;
  } catch (error) {
    logger.error('Error getting facets:', error);
    throw error;
  }
}
