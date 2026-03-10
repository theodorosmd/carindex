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
    const selectColumns = 'brand, model, fuel_type, transmission, steering, doors, seller_type, color, category, drivetrain, version, trim, location_country, posted_date';
    
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

    if (baseFilters.steering) {
      const steerings = Array.isArray(baseFilters.steering) ? baseFilters.steering : [baseFilters.steering];
      const steeringMap = { left: 'LHD', right: 'RHD' };
      const mapped = steerings.map(s => steeringMap[s] || s);
      query = query.in('steering', mapped);
    }

    if (baseFilters.transmission) {
      const transmissions = Array.isArray(baseFilters.transmission) ? baseFilters.transmission : [baseFilters.transmission];
      query = query.in('transmission', transmissions);
    }

    if (baseFilters.model) {
      const models = Array.isArray(baseFilters.model) ? baseFilters.model : [baseFilters.model];
      query = query.in('model', models.map(m => m.toLowerCase()));
    }

    if (baseFilters.color && baseFilters.color !== 'any') {
      query = query.ilike('color', baseFilters.color);
    }

    if (baseFilters.version) {
      const versions = Array.isArray(baseFilters.version) ? baseFilters.version : [baseFilters.version];
      query = query.in('version', versions);
    }

    if (baseFilters.trim) {
      const trims = Array.isArray(baseFilters.trim) ? baseFilters.trim : [baseFilters.trim];
      query = query.in('trim', trims);
    }

    if (baseFilters.keyword) {
      query = query.or(`brand.ilike.%${baseFilters.keyword}%,model.ilike.%${baseFilters.keyword}%,description.ilike.%${baseFilters.keyword}%`);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    if (baseFilters.publication_date === 'recent') {
      query = query.gte('posted_date', thirtyDaysAgoIso);
    } else if (baseFilters.publication_date === 'old') {
      query = query.or(`posted_date.lt.${thirtyDaysAgoIso},posted_date.is.null`);
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

    if (baseFilters.steering) {
      const steerings = Array.isArray(baseFilters.steering) ? baseFilters.steering : [baseFilters.steering];
      const steeringMap = { left: 'LHD', right: 'RHD' };
      const mapped = steerings.map(s => steeringMap[s] || s);
      countQuery = countQuery.in('steering', mapped);
    }

    if (baseFilters.transmission) {
      const transmissions = Array.isArray(baseFilters.transmission) ? baseFilters.transmission : [baseFilters.transmission];
      countQuery = countQuery.in('transmission', transmissions);
    }

    if (baseFilters.model) {
      const models = Array.isArray(baseFilters.model) ? baseFilters.model : [baseFilters.model];
      countQuery = countQuery.in('model', models.map(m => m.toLowerCase()));
    }

    if (baseFilters.color && baseFilters.color !== 'any') {
      countQuery = countQuery.ilike('color', baseFilters.color);
    }

    if (baseFilters.version) {
      const versions = Array.isArray(baseFilters.version) ? baseFilters.version : [baseFilters.version];
      countQuery = countQuery.in('version', versions);
    }

    if (baseFilters.trim) {
      const trims = Array.isArray(baseFilters.trim) ? baseFilters.trim : [baseFilters.trim];
      countQuery = countQuery.in('trim', trims);
    }

    if (baseFilters.keyword) {
      countQuery = countQuery.or(`brand.ilike.%${baseFilters.keyword}%,model.ilike.%${baseFilters.keyword}%,description.ilike.%${baseFilters.keyword}%`);
    }

    if (baseFilters.publication_date === 'recent') {
      countQuery = countQuery.gte('posted_date', thirtyDaysAgoIso);
    } else if (baseFilters.publication_date === 'old') {
      countQuery = countQuery.or(`posted_date.lt.${thirtyDaysAgoIso},posted_date.is.null`);
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
      countries: {},
      fuel_types: {},
      transmissions: {},
      steering: {},
      doors: {},
      seller_types: {},
      colors: {},
      categories: {},
      drivetrains: {},
      versions: {},
      trims: {},
      publication_date: { recent: 0, old: 0 }
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

      // Countries - only count non-null, non-empty values
      if (listing.location_country && String(listing.location_country).trim() !== '') {
        const code = String(listing.location_country).toUpperCase().slice(0, 2);
        facets.countries[code] = (facets.countries[code] || 0) + 1;
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

      // Publication date: recent (< 30 days) vs old (>= 30 days or null)
      if (listing.posted_date) {
        const posted = new Date(listing.posted_date).getTime();
        if (posted >= thirtyDaysAgo.getTime()) {
          facets.publication_date.recent++;
        } else {
          facets.publication_date.old++;
        }
      } else {
        facets.publication_date.old++;
      }
    });

    // Keywords facets: count listings matching each predefined keyword (separate queries)
    const keywordFacets = [];
    const predefinedKeywords = ['AMG', 'L1H1'];
    const buildKeywordCountQuery = (keyword) => {
      let q = supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active');
      q = q.or(`brand.ilike.%${keyword}%,model.ilike.%${keyword}%,description.ilike.%${keyword}%`);
      if (baseFilters.brand) {
        const brands = Array.isArray(baseFilters.brand) ? baseFilters.brand : [baseFilters.brand];
        q = q.in('brand', brands.map(b => b.toLowerCase()));
      }
      if (baseFilters.model) {
        const models = Array.isArray(baseFilters.model) ? baseFilters.model : [baseFilters.model];
        q = q.in('model', models.map(m => m.toLowerCase()));
      }
      if (baseFilters.country) q = q.eq('location_country', baseFilters.country);
      if (baseFilters.min_price) q = q.gte('price', baseFilters.min_price);
      if (baseFilters.max_price) q = q.lte('price', baseFilters.max_price);
      if (baseFilters.min_year) q = q.gte('year', baseFilters.min_year);
      if (baseFilters.max_year) q = q.lte('year', baseFilters.max_year);
      if (baseFilters.min_mileage) q = q.gte('mileage', baseFilters.min_mileage);
      if (baseFilters.max_mileage) q = q.lte('mileage', baseFilters.max_mileage);
      if (baseFilters.fuel_type) {
        const fuels = Array.isArray(baseFilters.fuel_type) ? baseFilters.fuel_type : [baseFilters.fuel_type];
        q = q.in('fuel_type', fuels);
      }
      if (baseFilters.steering) {
        const steerings = Array.isArray(baseFilters.steering) ? baseFilters.steering : [baseFilters.steering];
        const steeringMap = { left: 'LHD', right: 'RHD' };
        q = q.in('steering', steerings.map(s => steeringMap[s] || s));
      }
      if (baseFilters.transmission) {
        const transmissions = Array.isArray(baseFilters.transmission) ? baseFilters.transmission : [baseFilters.transmission];
        q = q.in('transmission', transmissions);
      }
      return q;
    };
    for (const kw of predefinedKeywords) {
      const { count: kwCount, error: kwErr } = await buildKeywordCountQuery(kw);
      if (kwErr) logger.warn('Keyword facet count failed', { keyword: kw, error: kwErr.message });
      keywordFacets.push({ name: kw, count: kwCount ?? 0 });
    }
    // "NOT SPECIFIED" = total count (all listings matching current filters)
    keywordFacets.unshift({ name: '', count: totalCount ?? listings?.length ?? 0 });

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
        countries: Object.entries(facets.countries)
          .filter(([name]) => name && name.trim() !== '')
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
          .sort((a, b) => b.count - a.count),
        publication_date: [
          { name: 'recent', count: facets.publication_date.recent },
          { name: 'old', count: facets.publication_date.old }
        ],
        keywords: keywordFacets
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
