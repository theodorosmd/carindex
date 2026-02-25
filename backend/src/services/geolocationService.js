import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Search listings within a radius (in km) from a location
 */
export async function searchListingsByDistance(filters) {
  const {
    latitude,
    longitude,
    radius_km = 50,
    ...otherFilters
  } = filters;

  if (!latitude || !longitude) {
    throw new Error('latitude and longitude are required for distance search');
  }

  try {
    // Build base query
    let query = `
      SELECT 
        *,
        (
          6371 * acos(
            cos(radians($1)) * 
            cos(radians(location_latitude)) * 
            cos(radians(location_longitude) - radians($2)) + 
            sin(radians($1)) * 
            sin(radians(location_latitude))
          )
        ) AS distance_km
      FROM listings
      WHERE status = 'active'
        AND location_latitude IS NOT NULL
        AND location_longitude IS NOT NULL
    `;
    
    const queryParams = [latitude, longitude];
    let paramIndex = 3;

    // Add distance filter
    query += ` HAVING distance_km <= $${paramIndex}`;
    queryParams.push(radius_km);
    paramIndex++;

    // Apply other filters (simplified - would integrate with main search)
    if (otherFilters.brand) {
      const brands = Array.isArray(otherFilters.brand) ? otherFilters.brand : [otherFilters.brand];
      query += ` AND LOWER(brand) = ANY($${paramIndex})`;
      queryParams.push(brands.map(b => b.toLowerCase()));
      paramIndex++;
    }

    if (otherFilters.min_price) {
      query += ` AND price >= $${paramIndex}`;
      queryParams.push(otherFilters.min_price);
      paramIndex++;
    }

    if (otherFilters.max_price) {
      query += ` AND price <= $${paramIndex}`;
      queryParams.push(otherFilters.max_price);
      paramIndex++;
    }

    // Order by distance
    query += ` ORDER BY distance_km ASC`;

    // Add limit/offset
    if (otherFilters.limit) {
      query += ` LIMIT $${paramIndex}`;
      queryParams.push(otherFilters.limit);
      paramIndex++;
    }

    if (otherFilters.offset) {
      query += ` OFFSET $${paramIndex}`;
      queryParams.push(otherFilters.offset);
    }

    const result = await db.query(query, queryParams);
    
    return {
      listings: result.rows,
      total: result.rows.length, // Simplified - would need separate count query
      center: { latitude, longitude },
      radius_km
    };
  } catch (error) {
    logger.error('Error searching by distance:', error);
    throw error;
  }
}








