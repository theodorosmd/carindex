import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { PLAN_LIMITS, getPlanLimits } from '../middleware/planLimits.js';

/**
 * Get admin dashboard statistics
 * Never throws - returns partial data on any error so admin UI stays usable.
 */
export async function getAdminStats() {
  const defaults = {
    users: { total: 0, recent: 0, by_plan: {} },
    listings: { total: 0, active: 0, by_source: {} },
    alerts: { total: 0, active: 0 }
  };

  try {
    // listing_totals_cache is kept accurate by statement-level triggers (one fire per batch, not per row).
    // listing_stats_cache tracks per-source breakdown the same way.
    const [totalUsers, listingsBySourceResult, listingTotalsResult, totalAlerts, activeAlerts] = await Promise.all([
      safeCount('users', supabase.from('users').select('*', { count: 'exact', head: true })),
      safeSelect('listing_stats_cache', supabase.from('listing_stats_cache').select('source_platform, total_count').order('total_count', { ascending: false })),
      safeSelect('listing_totals_cache', supabase.from('listing_totals_cache').select('total_count, active_count, updated_at').eq('id', 1).single()),
      safeCount('alerts', supabase.from('alerts').select('*', { count: 'exact', head: true })),
      safeCount('alerts', supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'active'))
    ]);

    const listingTotals = Array.isArray(listingTotalsResult) ? listingTotalsResult[0] : listingTotalsResult;
    const totalListings = Number(listingTotals?.total_count || 0);
    const activeListings = Number(listingTotals?.active_count || 0);
    const listingsCacheUpdatedAt = listingTotals?.updated_at || null;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let recentUsers = 0;
    let usersByPlan = [];

    try {
      recentUsers = await safeCount('users', supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()));
    } catch (e) {
      logger.warn('Admin stats: recentUsers failed', { error: e.message });
    }

    try {
      usersByPlan = await safeSelect('users', supabase
        .from('users')
        .select('plan')
        .not('plan', 'is', null));
    } catch (e) {
      logger.warn('Admin stats: usersByPlan failed', { error: e.message });
    }

    const planDistribution = {};
    (usersByPlan || []).forEach(user => {
      if (user?.plan) planDistribution[user.plan] = (planDistribution[user.plan] || 0) + 1;
    });

    // Build sourceDistribution from the cache result already fetched above
    const sourceDistribution = {};
    (listingsBySourceResult || []).forEach(row => {
      if (row?.source_platform) {
        sourceDistribution[row.source_platform] = Number(row.total_count || 0);
      }
    });

    return {
      users: {
        total: totalUsers ?? 0,
        recent: recentUsers ?? 0,
        by_plan: planDistribution
      },
      listings: {
        total: totalListings ?? 0,
        active: activeListings ?? 0,
        by_source: sourceDistribution,
        cache_updated_at: listingsCacheUpdatedAt
      },
      alerts: {
        total: totalAlerts ?? 0,
        active: activeAlerts ?? 0
      }
    };
  } catch (error) {
    logger.error('Error getting admin stats', { error: error.message, stack: error.stack });
    return defaults;
  }
}

function isMissingTableError(error) {
  if (!error) return false;
  const msg = error.message || '';
  return (
    error.code === '42P01' ||
    error.code === 'PGRST116' ||
    /relation .* does not exist/i.test(msg) ||
    /could not find/i.test(msg)
  );
}

function isMissingColumnError(error) {
  if (!error) return false;
  const msg = error.message || '';
  return (
    error.code === '42703' ||
    /column .* does not exist/i.test(msg) ||
    /undefined column/i.test(msg)
  );
}

async function safeCount(table, query) {
  const { count, error } = await query;
  if (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) {
      logger.warn('Admin stats query failed, returning 0', { table, error: error.message });
      return 0;
    }
    throw error;
  }
  return count || 0;
}

async function safeSelect(table, query) {
  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) {
      logger.warn('Admin stats query failed, returning empty list', { table, error: error.message });
      return [];
    }
    throw error;
  }
  return data || [];
}

async function safeRpc(fn, params = {}) {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) {
    logger.warn('Admin stats RPC failed, returning empty list', { fn, error: error.message });
    return [];
  }
  return data || [];
}

async function safeRpcScalar(fn, params = {}) {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) {
    logger.warn('Admin stats RPC scalar failed, returning 0', { fn, error: error.message });
    return 0;
  }
  return Number(data) || 0;
}

/**
 * Get all users (paginated)
 */
export async function getAllUsers(limit = 50, offset = 0) {
  try {
    const { data: users, error, count } = await supabase
      .from('users')
      .select('id, email, plan, role, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (isMissingTableError(error) || isMissingColumnError(error)) {
        logger.warn('Users query failed, returning empty list for admin users', { error: error.message });
        return {
          users: [],
          total: 0,
          limit,
          offset
        };
      }
      throw error;
    }

    return {
      users: users || [],
      total: count || 0,
      limit,
      offset
    };
  } catch (error) {
    logger.error('Error getting all users', { error: error.message });
    throw error;
  }
}

/**
 * Update user role
 */
export async function updateUserRole(userId, role) {
  try {
    if (!['user', 'admin'].includes(role)) {
      throw new Error('Invalid role. Must be "user" or "admin"');
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, plan, role, updated_at')
      .single();

    if (error) throw error;

    logger.info('User role updated', { userId, role, email: user.email });

    return user;
  } catch (error) {
    logger.error('Error updating user role', { error: error.message, userId, role });
    throw error;
  }
}

/** Capacité cible (listings/jour) pour ETA "→ 100%" — 0 = utiliser le rythme réel uniquement */
const DEFAULT_ESTIMATED_SAVED_PER_DAY = {
  'mobile.de': 0,
  autoscout24: 0,
  leboncoin: 0,
  largus: 0,
  lacentrale: 0,
  blocket: 0,
  bilweb: 0,
  bytbil: 0,
  subito: 0,
  gaspedaal: 0,
  marktplaats: 0,
  'coches.net': 0,
  finn: 0,
  otomoto: 0,
  '2ememain': 0,
  deuxememain: 0
};

const SOURCE_ENV_KEYS = {
  'mobile.de': 'MOBILEDE_ESTIMATED_SAVED_PER_DAY',
  autoscout24: 'AUTOSCOUT24_ESTIMATED_SAVED_PER_DAY',
  leboncoin: 'LEBONCOIN_ESTIMATED_SAVED_PER_DAY',
  largus: 'LARGUS_ESTIMATED_SAVED_PER_DAY',
  lacentrale: 'LACENTRALE_ESTIMATED_SAVED_PER_DAY',
  blocket: 'BLOCKET_ESTIMATED_SAVED_PER_DAY',
  bilweb: 'BILWEB_ESTIMATED_SAVED_PER_DAY',
  bytbil: 'BYTBIL_ESTIMATED_SAVED_PER_DAY',
  subito: 'SUBITO_ESTIMATED_SAVED_PER_DAY',
  gaspedaal: 'GASPEDAAL_ESTIMATED_SAVED_PER_DAY',
  marktplaats: 'MARKTPLAATS_ESTIMATED_SAVED_PER_DAY',
  'coches.net': 'COCHES_NET_ESTIMATED_SAVED_PER_DAY',
  finn: 'FINN_ESTIMATED_SAVED_PER_DAY',
  otomoto: 'OTOMOTO_ESTIMATED_SAVED_PER_DAY',
  '2ememain': 'DEUXEMEMAIN_ESTIMATED_SAVED_PER_DAY',
  deuxememain: 'DEUXEMEMAIN_ESTIMATED_SAVED_PER_DAY'
};

function getEstimatedSavedPerDay(source) {
  const envKey = SOURCE_ENV_KEYS[source];
  if (envKey) {
    const val = parseInt(process.env[envKey] ?? '', 10);
    if (!Number.isNaN(val)) return val;
  }
  return DEFAULT_ESTIMATED_SAVED_PER_DAY[source] ?? 0;
}

/**
 * Get scraper dashboard stats: runs, crons, OK/pending/failed per website
 */
export async function getScraperDashboardStats() {
  try {
    // 1. Scraper runs by source and status (last N days for rate estimate)
    const DAYS_FOR_RATE = 7;  // shorter = estimate reacts faster to recent parallelization
    const DAYS_FOR_LISTINGS_GROWTH = 14;  // longer to capture Oleg-style bursts (6M in 2 weeks)
    const rateCutoff = new Date();
    rateCutoff.setDate(rateCutoff.getDate() - DAYS_FOR_RATE);
    const listingsGrowthCutoff = new Date();
    listingsGrowthCutoff.setDate(listingsGrowthCutoff.getDate() - DAYS_FOR_LISTINGS_GROWTH);

    const runsData = await safeSelect('scraper_runs', supabase
      .from('scraper_runs')
      .select('source_platform, status, total_scraped, total_saved, started_at, finished_at')
      .gte('started_at', rateCutoff.toISOString())
      .order('finished_at', { ascending: false, nullsFirst: false }));

    const runsBySource = {};
    const lastRunBySource = {};
    const lastSuccessBySource = {};
    const savedBySource = {}; // total_saved per source (last N days) for time-to-100% estimate
    let totals = { ok: 0, pending: 0, failed: 0 };

    const normalizeSourceRuns = (s) => (['mobile_de', 'mobilede'].includes((s || '').toLowerCase()) ? 'mobile.de' : s);
    (runsData || []).forEach((run) => {
      const rawSrc = run.source_platform || 'unknown';
      const src = normalizeSourceRuns(rawSrc);
      if (!runsBySource[src]) {
        runsBySource[src] = { ok: 0, pending: 0, failed: 0 };
      }
      if (!lastRunBySource[src]) {
        lastRunBySource[src] = {
          total_scraped: run.total_scraped ?? 0,
          total_saved: run.total_saved ?? 0,
          status: (run.status || 'unknown').toLowerCase(),
          finished_at: run.finished_at,
          started_at: run.started_at
        };
      }
      if ((run.status || '').toLowerCase() === 'success' && !lastSuccessBySource[src]) {
        lastSuccessBySource[src] = {
          total_scraped: run.total_scraped ?? 0,
          total_saved: run.total_saved ?? 0,
          finished_at: run.finished_at,
          started_at: run.started_at
        };
      }
      const status = (run.status || '').toLowerCase();
      const saved = run.total_saved ?? 0;
      if (status === 'success') {
        runsBySource[src].ok += 1;
        totals.ok += 1;
        savedBySource[src] = (savedBySource[src] || 0) + saved;
      } else if (status === 'failed' && saved > 0) {
        runsBySource[src].failed += 1;
        totals.failed += 1;
        savedBySource[src] = (savedBySource[src] || 0) + saved;  // partial success counts for rate
      } else if (status === 'running') {
        runsBySource[src].pending += 1;
        totals.pending += 1;
      } else {
        runsBySource[src].failed += 1;
        totals.failed += 1;
      }
    });

    // Also aggregate from scraper_run (bytbil Python, other external scrapers)
    // Table may not exist in all deployments - wrap in try/catch
    let scraperRunData = [];
    try {
      scraperRunData = await safeSelect('scraper_run', supabase
        .from('scraper_run')
        .select('source, start_time, end_time, error_count')
        .gte('start_time', rateCutoff.toISOString()));
    } catch (e) {
      logger.warn('scraper_run query failed (table may not exist)', { error: e.message });
    }

    const normalizeSource = (s) => (['mobile_de', 'mobilede'].includes(s) ? 'mobile.de' : s);
    const scraperRunSorted = (scraperRunData || []).slice().sort((a, b) => {
      const aEnd = a.end_time || a.start_time || '';
      const bEnd = b.end_time || b.start_time || '';
      return bEnd.localeCompare(aEnd);
    });
    scraperRunSorted.forEach((run) => {
      const src = normalizeSource((run.source || 'unknown').toLowerCase());
      if (!lastRunBySource[src]) {
        lastRunBySource[src] = {
          total_scraped: null,
          total_saved: null,
          status: run.end_time == null ? 'running' : (run.error_count || 0) > 0 ? 'failed' : 'success',
          finished_at: run.end_time,
          started_at: run.start_time,
          error_count: run.error_count
        };
      }
      if (run.end_time != null && (run.error_count || 0) === 0 && !lastSuccessBySource[src]) {
        lastSuccessBySource[src] = {
          total_scraped: null,
          total_saved: null,
          finished_at: run.end_time,
          started_at: run.start_time
        };
      }
    });
    (scraperRunData || []).forEach((run) => {
      const src = normalizeSource((run.source || 'unknown').toLowerCase());
      if (!runsBySource[src]) {
        runsBySource[src] = { ok: 0, pending: 0, failed: 0 };
      }
      if (run.end_time == null) {
        runsBySource[src].pending += 1;
        totals.pending += 1;
      } else if ((run.error_count || 0) > 0) {
        runsBySource[src].failed += 1;
        totals.failed += 1;
      } else {
        runsBySource[src].ok += 1;
        totals.ok += 1;
      }
    });

    // 2. Auto scrapers (crons) with schedule and last run
    const autoScrapersData = await safeSelect('auto_scrapers', supabase
      .from('auto_scrapers')
      .select('id, source, name, schedule_cron, enabled, last_run_at, last_run_status, last_run_result')
      .order('source'));

    const crons = (autoScrapersData || []).map((s) => ({
      id: s.id,
      source: s.source,
      name: s.name,
      cron: s.schedule_cron,
      enabled: s.enabled ?? true,
      last_run_at: s.last_run_at,
      last_run_status: s.last_run_status,
      last_run_result: s.last_run_result
    }));

    // 3. Raw listings pending (processed_at IS NULL) by source — single RPC call
    const normalizeRawSource = (s) => (['mobile_de', 'mobilede'].includes(s) ? 'mobile.de' : s);
    const rawPendingData = await safeRpc('get_raw_listings_pending_by_source');
    const rawPendingBySource = {};
    (rawPendingData || []).forEach((row) => {
      const key = normalizeRawSource(row.source_platform || 'unknown');
      rawPendingBySource[key] = (rawPendingBySource[key] || 0) + Number(row.cnt || 0);
    });

    // 4. mobile_de_fetch_queue - URLs en attente + en cours (spécifique mobile.de)
    const mobiledeQueuePending = await safeCount('mobile_de_fetch_queue', supabase
      .from('mobile_de_fetch_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'retry']));
    const mobiledeQueueProcessing = await safeCount('mobile_de_fetch_queue', supabase
      .from('mobile_de_fetch_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing'));

    // 4b. leboncoin_fetch_queue - URLs en attente + en cours
    const leboncoinQueuePending = await safeCount('leboncoin_fetch_queue', supabase
      .from('leboncoin_fetch_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'retry']));
    const leboncoinQueueProcessing = await safeCount('leboncoin_fetch_queue', supabase
      .from('leboncoin_fetch_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing'));

    // 5. Site totals (total vehicles available on each marketplace, for % scraped)
    const siteTotalsData = await safeSelect('source_site_totals', supabase
      .from('source_site_totals')
      .select('source_platform, total_available'));
    const siteTotalsBySource = {};
    (siteTotalsData || []).forEach((row) => {
      siteTotalsBySource[row.source_platform] = row.total_available ?? 0;
    });

    // 6. Listings by source — read from pre-computed cache (instant, avoids COUNT(*) timeout)
    const normalizeListingSource = (s) => (['mobile_de', 'mobilede'].includes(s) ? 'mobile.de' : s);
    const cachedSourceCounts = await safeSelect('listing_stats_cache', supabase
      .from('listing_stats_cache')
      .select('source_platform, total_count, recent_14d_count'));
    const listingsBySource = {};
    const listingsCreatedLast7dBySource = {};
    (cachedSourceCounts || []).forEach((row) => {
      const key = normalizeListingSource(row.source_platform || 'unknown');
      listingsBySource[key] = (listingsBySource[key] || 0) + Number(row.total_count || 0);
      listingsCreatedLast7dBySource[key] = (listingsCreatedLast7dBySource[key] || 0) + Number(row.recent_14d_count || 0);
    });

    // Build per-website breakdown (merge all known sources)
    // Include all known sources so they always appear, even with 0 data
    const allKnownSourcesForDisplay = ['autoscout24', 'mobile.de', 'leboncoin', 'largus', 'lacentrale', 'blocket', 'bilweb', 'bytbil', 'subito', 'gaspedaal', 'marktplaats', 'coches.net', 'finn', 'otomoto'];
    const allSources = new Set([
      ...allKnownSourcesForDisplay,
      ...Object.keys(runsBySource),
      ...Object.keys(rawPendingBySource),
      ...Object.keys(listingsBySource),
      ...crons.map((c) => c.source)
    ]);

    const normalizeForLookup = (s) => (['mobile_de', 'mobilede'].includes(s) ? 'mobile.de' : s);
    const byWebsite = Array.from(allSources).map((source) => {
      const runs = runsBySource[source] || runsBySource[normalizeForLookup(source)] || { ok: 0, pending: 0, failed: 0 };
      const cronsForSource = crons.filter((c) => c.source === source);
      const lastRun = lastRunBySource[source] || lastRunBySource[normalizeForLookup(source)] || null;
      const lastSuccess = lastSuccessBySource[source] || lastSuccessBySource[normalizeForLookup(source)] || null;
      const isMobileDe = source === 'mobile.de' || normalizeForLookup(source) === 'mobile.de';
      const isLeboncoin = source === 'leboncoin';
      const siteTotal = siteTotalsBySource[source] || null;
      const listingsTotal = listingsBySource[source] || 0;
      const totalSaved30d = savedBySource[source] || savedBySource[normalizeForLookup(source)] || 0;
      const savedPerDayFromRuns = totalSaved30d > 0 ? totalSaved30d / DAYS_FOR_RATE : 0;
      const createdLast14d = listingsCreatedLast7dBySource[source] || listingsCreatedLast7dBySource[normalizeForLookup(source)] || 0;
      const savedPerDayFromListings = createdLast14d > 0 ? createdLast14d / DAYS_FOR_LISTINGS_GROWTH : 0;
      // Use max: listings growth reflects all ingest paths (crons, queue, API, Oleg); scraper_runs can undercount
      let savedPerDay = Math.max(savedPerDayFromRuns, savedPerDayFromListings);
      // Override: capacité cible pour ETA réaliste (évite mois/années pour tous les sites)
      const override = getEstimatedSavedPerDay(source);
      if (override > 0 && override > savedPerDay) {
        savedPerDay = override;
      }
      const remaining = (siteTotal > 0 && listingsTotal < siteTotal) ? siteTotal - listingsTotal : 0;
      let time_to_100_days = null;
      if (remaining > 0 && savedPerDay > 0) {
        time_to_100_days = remaining / savedPerDay;
      }
      return {
        source,
        runs_ok: runs.ok,
        runs_pending: runs.pending,
        runs_failed: runs.failed,
        raw_pending: rawPendingBySource[source] || 0,
        queue_urls_pending: isMobileDe ? mobiledeQueuePending : (isLeboncoin ? leboncoinQueuePending : 0),
        queue_urls_processing: isMobileDe ? mobiledeQueueProcessing : (isLeboncoin ? leboncoinQueueProcessing : 0),
        listings_total: listingsTotal,
        site_total_available: siteTotal,
        last_run: lastRun,
        last_success: lastSuccess,
        crons: cronsForSource,
        time_to_100_days: time_to_100_days,
        saved_per_day: savedPerDay
      };
    }).sort((a, b) => a.source.localeCompare(b.source));

    // Grand total from cache (kept accurate by statement-level triggers)
    const grandTotalCache = await safeSelect('listing_totals_cache', supabase.from('listing_totals_cache').select('total_count').eq('id', 1).single());
    const grandTotalRow = Array.isArray(grandTotalCache) ? grandTotalCache[0] : grandTotalCache;
    const listingsGrandTotal = Number(grandTotalRow?.total_count || 0) || Object.values(listingsBySource).reduce((sum, n) => sum + n, 0);

    let totalTimeTo100Days = null;
    let totalRemaining = 0;
    let totalSavedPerDay = 0;
    for (const w of byWebsite) {
      const siteTotal = w.site_total_available || 0;
      const listingsTotal = w.listings_total || 0;
      if (siteTotal > 0 && listingsTotal < siteTotal) {
        totalRemaining += siteTotal - listingsTotal;
      }
      totalSavedPerDay += w.saved_per_day || 0;
    }
    if (totalRemaining > 0 && totalSavedPerDay > 0) {
      totalTimeTo100Days = totalRemaining / totalSavedPerDay;
    }

    return {
      totals: {
        runs_ok: totals.ok,
        runs_pending: totals.pending,
        runs_failed: totals.failed,
        runs_total: totals.ok + totals.pending + totals.failed,
        listings_total: listingsGrandTotal || 0,
        time_to_100_days: totalTimeTo100Days
      },
      by_website: byWebsite,
      crons
    };
  } catch (error) {
    logger.error('Error getting scraper dashboard stats', { error: error.message });
    // Return partial data instead of throwing - admin UI stays usable
    return {
      totals: { runs_ok: 0, runs_pending: 0, runs_failed: 0, runs_total: 0, listings_total: 0 },
      by_website: [],
      crons: []
    };
  }
}

/**
 * Get users who are at or near their plan limits (>= 80% of quota used).
 * Returns data for the admin usage monitoring table.
 */
export async function getUsersNearLimits(threshold = 80) {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, plan, created_at')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usersWithUsage = await Promise.all(
      (users || []).map(async (user) => {
        const plan = user.plan || 'starter';
        const limits = getPlanLimits(plan);

        const [searchesResult, alertsResult] = await Promise.all([
          supabase
            .from('user_searches')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'active')
        ]);

        const searchesCount = searchesResult.count || 0;
        const alertsCount = alertsResult.count || 0;

        const searchesPct = limits.searches_per_month === -1 ? 0
          : Math.round((searchesCount / limits.searches_per_month) * 100);
        const alertsPct = limits.alerts_active === -1 ? 0
          : Math.round((alertsCount / limits.alerts_active) * 100);
        const maxPct = Math.max(searchesPct, alertsPct);

        return {
          id: user.id,
          email: user.email,
          plan,
          created_at: user.created_at,
          searches: {
            count: searchesCount,
            limit: limits.searches_per_month,
            pct: searchesPct
          },
          alerts: {
            count: alertsCount,
            limit: limits.alerts_active,
            pct: alertsPct
          },
          max_usage_pct: maxPct
        };
      })
    );

    return usersWithUsage
      .filter(u => u.max_usage_pct >= threshold)
      .sort((a, b) => b.max_usage_pct - a.max_usage_pct);
  } catch (error) {
    logger.error('Error getting users near limits', { error: error.message });
    throw error;
  }
}

/**
 * Refresh the listing stats cache (call after scraper batches).
 * Safe to call frequently — runs in the DB so no network timeout risk.
 */
export async function refreshListingStatsCache() {
  const { error } = await supabase.rpc('refresh_listing_stats_cache');
  if (error) {
    logger.error('Failed to refresh listing stats cache', { error: error.message });
    throw error;
  }
  logger.info('Listing stats cache refreshed');
}

/**
 * Update user plan
 */
export async function updateUserPlan(userId, plan) {
  try {
    const validPlans = ['starter', 'pro', 'plus'];
    if (!validPlans.includes(plan)) {
      throw new Error(`Invalid plan. Must be one of: ${validPlans.join(', ')}`);
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ plan, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, plan, role, updated_at')
      .single();

    if (error) throw error;

    logger.info('User plan updated', { userId, plan, email: user.email });

    return user;
  } catch (error) {
    logger.error('Error updating user plan', { error: error.message, userId, plan });
    throw error;
  }
}







