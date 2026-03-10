import { getFacetsService, clearFacetsCache } from '../services/facetsService.js';
import { logger } from '../utils/logger.js';

export async function getFacets(req, res, next) {
  try {
    const {
      brand,
      model,
      min_price,
      max_price,
      min_year,
      max_year,
      min_mileage,
      max_mileage,
      country,
      fuel_type,
      seller_type,
      steering,
      transmission,
      doors,
      color,
      version,
      trim,
      keyword,
      publication_date
    } = req.query;

    // Parse array parameters
    const parseArrayParam = (param) => {
      if (!param) return null;
      if (Array.isArray(param)) return param;
      if (typeof param === 'string' && param.includes(',')) return param.split(',');
      return [param];
    };

    const baseFilters = {
      brand: parseArrayParam(brand),
      model: parseArrayParam(model),
      min_price: min_price ? parseInt(min_price) : null,
      max_price: max_price ? parseInt(max_price) : null,
      min_year: min_year ? parseInt(min_year) : null,
      max_year: max_year ? parseInt(max_year) : null,
      min_mileage: min_mileage ? parseInt(min_mileage) : null,
      max_mileage: max_mileage ? parseInt(max_mileage) : null,
      country: country || null,
      fuel_type: parseArrayParam(fuel_type),
      seller_type: parseArrayParam(seller_type),
      steering: parseArrayParam(steering),
      transmission: parseArrayParam(transmission),
      doors: parseArrayParam(doors),
      color: color || null,
      version: parseArrayParam(version),
      trim: parseArrayParam(trim),
      keyword: keyword || null,
      publication_date: publication_date || null
    };

    const result = await getFacetsService(baseFilters);
    
    logger.info('Facets response', { 
      total: result.total,
      brandsCount: result.facets.brands.length,
      sampleBrands: result.facets.brands.slice(0, 5).map(b => `${b.name}: ${b.count}`),
      allBrands: result.facets.brands.map(b => `${b.name}: ${b.count}`)
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting facets', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * Clear facets cache (admin endpoint for debugging)
 */
export async function clearFacetsCacheController(req, res, next) {
  try {
    clearFacetsCache();
    res.json({ success: true, message: 'Facets cache cleared' });
  } catch (error) {
    logger.error('Error clearing facets cache', { error: error.message });
    next(error);
  }
}


