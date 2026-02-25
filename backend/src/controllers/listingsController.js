import { searchListingsService, getListingByIdService } from '../services/listingsService.js';
import { getPriceHistory } from '../services/priceHistoryService.js';
import { logger } from '../utils/logger.js';

export async function searchListings(req, res, next) {
  try {
    const {
      query: searchQuery,
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
      transmission,
      steering,
      doors,
      seller_type,
      color,
      version,
      trim,
      keyword,
      sort = 'date',
      limit = 50,
      offset = 0
    } = req.query;

    logger.info('Listings search request', {
      searchQuery,
      brand,
      model,
      min_price,
      max_price,
      userId: req.user?.id
    });

    // Handle array parameters (can come as comma-separated or multiple query params)
    const parseArrayParam = (param) => {
      if (!param) return null;
      if (Array.isArray(param)) return param;
      if (typeof param === 'string' && param.includes(',')) return param.split(',');
      return [param];
    };

    // Get user plan for premium features (market price, confidence index)
    const userPlan = req.user?.plan || null;

    const result = await searchListingsService({
      query: searchQuery,
      brand: parseArrayParam(brand),
      model: parseArrayParam(model),
      min_price: min_price ? parseInt(min_price) : null,
      max_price: max_price ? parseInt(max_price) : null,
      min_year: min_year ? parseInt(min_year) : null,
      max_year: max_year ? parseInt(max_year) : null,
      min_mileage: min_mileage ? parseInt(min_mileage) : null,
      max_mileage: max_mileage ? parseInt(max_mileage) : null,
      country,
      fuel_type: parseArrayParam(fuel_type),
      transmission: parseArrayParam(transmission),
      steering: parseArrayParam(steering),
      doors: parseArrayParam(doors),
      seller_type: parseArrayParam(seller_type),
      color,
      version: parseArrayParam(version),
      trim: parseArrayParam(trim),
      keyword,
      sort,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }, userPlan);

    res.json(result);
  } catch (error) {
    logger.error('Error searching listings', { error: error.message });
    next(error);
  }
}

export async function getListingById(req, res, next) {
  try {
    const { id } = req.params;

    logger.info('Get listing by ID request', {
      listingId: id,
      userId: req.user?.id
    });

    // Get user plan for premium features (market price, confidence index)
    const userPlan = req.user?.plan || null;

    const listing = await getListingByIdService(id, userPlan);

    if (!listing) {
      return res.status(404).json({
        error: 'Listing not found',
        code: 'LISTING_NOT_FOUND'
      });
    }

    res.json(listing);
  } catch (error) {
    logger.error('Error getting listing by ID', { error: error.message });
    next(error);
  }
}

export async function getListingPriceHistory(req, res, next) {
  try {
    const { id } = req.params;

    logger.info('Get listing price history request', {
      listingId: id,
      userId: req.user?.id
    });

    const history = await getPriceHistory(id);

    res.json({
      success: true,
      listing_id: id,
      history
    });
  } catch (error) {
    logger.error('Error getting listing price history', { error: error.message });
    next(error);
  }
}


