import { getAdminStats, getScraperDashboardStats, getAllUsers, updateUserRole, updateUserPlan, getUsersNearLimits, refreshListingStatsCache } from '../services/adminService.js';
import { exportListingsCsvService } from '../services/listingsService.js';
import { logger } from '../utils/logger.js';

/**
 * Get admin dashboard statistics
 * GET /api/v1/admin/stats
 */
export async function getStats(req, res, next) {
  try {
    const stats = await getAdminStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error in admin stats route', { error: error.message, stack: error.stack });
    // Return 200 with empty stats instead of 500 - admin UI stays usable
    res.json({
      success: true,
      stats: {
        users: { total: 0, recent: 0, by_plan: {} },
        listings: { total: 0, active: 0, by_source: {} },
        alerts: { total: 0, active: 0 }
      }
    });
  }
}

/**
 * Get scraper dashboard stats
 * GET /api/v1/admin/scraper-dashboard
 */
export async function getScraperDashboard(req, res, next) {
  try {
    const stats = await getScraperDashboardStats();
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    logger.error('Error in scraper dashboard route', { error: error.message });
    // Return 200 with empty data instead of 500 - admin UI stays usable
    res.json({
      success: true,
      totals: { runs_ok: 0, runs_pending: 0, runs_failed: 0, runs_total: 0, listings_total: 0 },
      by_website: [],
      crons: []
    });
  }
}

/**
 * Get all users
 * GET /api/v1/admin/users
 */
export async function getUsers(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await getAllUsers(limit, offset);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error in admin users route', { error: error.message });
    next(error);
  }
}

/**
 * Update user role
 * PATCH /api/v1/admin/users/:userId/role
 */
export async function updateRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Role is required'
        }
      });
    }

    const user = await updateUserRole(userId, role);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Error in admin update role route', { error: error.message });
    next(error);
  }
}

/**
 * Update user plan
 * PATCH /api/v1/admin/users/:userId/plan
 */
export async function updatePlan(req, res, next) {
  try {
    const { userId } = req.params;
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plan is required'
        }
      });
    }

    const user = await updateUserPlan(userId, plan);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Error in admin update plan route', { error: error.message });
    next(error);
  }
}

/**
 * Get users near their plan limits
 * GET /api/v1/admin/users/near-limits?threshold=80
 */
export async function getUsersNearLimitsController(req, res, next) {
  try {
    const threshold = parseInt(req.query.threshold) || 80;
    const users = await getUsersNearLimits(threshold);
    res.json({ success: true, users });
  } catch (error) {
    logger.error('Error in admin users near-limits route', { error: error.message });
    next(error);
  }
}

/**
 * Export listings as CSV (admin only)
 * GET /api/v1/admin/listings/export/csv
 */
export async function exportListingsCsv(req, res, next) {
  try {
    const {
      brand,
      model,
      source_platform,
      status,
      country,
      min_price,
      max_price,
      min_year,
      max_year,
      min_mileage,
      max_mileage,
      posted_from,
      posted_to,
      last_seen_from,
      last_seen_to,
      limit,
      offset
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit, 10) || 5000, 20000);
    const parsedOffset = parseInt(offset, 10) || 0;

    const result = await exportListingsCsvService({
      brand,
      model,
      source_platform,
      status,
      country,
      min_price: min_price ? parseInt(min_price, 10) : null,
      max_price: max_price ? parseInt(max_price, 10) : null,
      min_year: min_year ? parseInt(min_year, 10) : null,
      max_year: max_year ? parseInt(max_year, 10) : null,
      min_mileage: min_mileage ? parseInt(min_mileage, 10) : null,
      max_mileage: max_mileage ? parseInt(max_mileage, 10) : null,
      posted_from,
      posted_to,
      last_seen_from,
      last_seen_to,
      limit: parsedLimit,
      offset: parsedOffset
    });

    const header = [
      'id',
      'source_platform',
      'source_listing_id',
      'brand',
      'model',
      'year',
      'mileage',
      'price',
      'currency',
      'location_city',
      'location_region',
      'location_country',
      'seller_type',
      'fuel_type',
      'transmission',
      'steering',
      'doors',
      'color',
      'url',
      'status',
      'posted_date',
      'first_seen',
      'last_seen',
      'sold_date',
      'price_drop_amount',
      'price_drop_pct',
      'last_price_drop_date',
      'run_id',
      'created_at',
      'updated_at'
    ];

    const rows = (result.listings || []).map(listing => ([
      listing.id,
      listing.source_platform,
      listing.source_listing_id,
      listing.brand,
      listing.model,
      listing.year,
      listing.mileage,
      listing.price,
      listing.currency,
      listing.location_city,
      listing.location_region,
      listing.location_country,
      listing.seller_type,
      listing.fuel_type,
      listing.transmission,
      listing.steering,
      listing.doors,
      listing.color,
      listing.url,
      listing.status,
      listing.posted_date,
      listing.first_seen,
      listing.last_seen,
      listing.sold_date,
      listing.price_drop_amount,
      listing.price_drop_pct,
      listing.last_price_drop_date,
      listing.run_id,
      listing.created_at,
      listing.updated_at
    ]));

    const csv = [header, ...rows]
      .map(line => line.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="listings_export.csv"');
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Error exporting listings csv', { error: error.message });
    next(error);
  }
}

/**
 * Refresh listing stats cache
 * POST /api/v1/admin/listings/stats/refresh
 */
export async function refreshListingsStatsCache(req, res, next) {
  try {
    await refreshListingStatsCache();
    res.json({ success: true, message: 'Listing stats cache refreshed' });
  } catch (error) {
    logger.error('Error refreshing listing stats cache', { error: error.message });
    next(error);
  }
}







