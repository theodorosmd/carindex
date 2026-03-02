import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

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
    const [totalUsers, totalListings, activeListings, totalAlerts, activeAlerts] = await Promise.all([
      safeCount('users', supabase.from('users').select('*', { count: 'exact', head: true })),
      safeCount('listings', supabase.from('listings').select('*', { count: 'exact', head: true })),
      safeCount('listings', supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active')),
      safeCount('alerts', supabase.from('alerts').select('*', { count: 'exact', head: true })),
      safeCount('alerts', supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'active'))
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let recentUsers = 0;
    let usersByPlan = [];
    let listingsBySource = [];

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

    try {
      listingsBySource = await safeSelect('listings', supabase
        .from('listings')
        .select('source_platform')
        .not('source_platform', 'is', null)
        .limit(5000));
    } catch (e) {
      logger.warn('Admin stats: listingsBySource failed', { error: e.message });
    }

    const sourceDistribution = {};
    (listingsBySource || []).forEach(listing => {
      if (listing?.source_platform) {
        sourceDistribution[listing.source_platform] = (sourceDistribution[listing.source_platform] || 0) + 1;
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
        by_source: sourceDistribution
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

/**
 * Get scraper dashboard stats: runs, crons, OK/pending/failed per website
 */
export async function getScraperDashboardStats() {
  try {
    // 1. Scraper runs by source and status (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const runsData = await safeSelect('scraper_runs', supabase
      .from('scraper_runs')
      .select('source_platform, status, total_scraped, total_saved, started_at, finished_at')
      .gte('started_at', thirtyDaysAgo.toISOString())
      .order('finished_at', { ascending: false, nullsFirst: false }));

    const runsBySource = {};
    const lastRunBySource = {};
    const lastSuccessBySource = {};
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
      if (status === 'success') {
        runsBySource[src].ok += 1;
        totals.ok += 1;
      } else if (status === 'running') {
        runsBySource[src].pending += 1;
        totals.pending += 1;
      } else {
        runsBySource[src].failed += 1;
        totals.failed += 1;
      }
    });

    // Also aggregate from scraper_run (bytbil Python, other external scrapers)
    const scraperRunData = await safeSelect('scraper_run', supabase
      .from('scraper_run')
      .select('source, start_time, end_time, error_count')
      .gte('start_time', thirtyDaysAgo.toISOString()));

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

    // 3. Raw listings pending (processed_at IS NULL) by source - count per known source
    const knownSources = ['autoscout24', 'mobile.de', 'mobile_de', 'mobilede', 'leboncoin', 'largus', 'lacentrale', 'blocket', 'bilweb', 'bytbil', 'subito', 'gaspedaal', 'coches.net', 'finn', 'otomoto'];
    const rawPendingBySource = {};
    const normalizeRawSource = (s) => (['mobile_de', 'mobilede'].includes(s) ? 'mobile.de' : s);
    for (const src of knownSources) {
      const count = await safeCount('raw_listings', supabase
        .from('raw_listings')
        .select('*', { count: 'exact', head: true })
        .eq('source_platform', src)
        .is('processed_at', null));
      if (count > 0) {
        const key = normalizeRawSource(src);
        rawPendingBySource[key] = (rawPendingBySource[key] || 0) + count;
      }
    }

    // 4. mobile_de_fetch_queue - URLs en attente + en cours (spécifique mobile.de)
    const mobiledeQueuePending = await safeCount('mobile_de_fetch_queue', supabase
      .from('mobile_de_fetch_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'retry']));
    const mobiledeQueueProcessing = await safeCount('mobile_de_fetch_queue', supabase
      .from('mobile_de_fetch_queue')
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

    // 6. Listings total by source - use count per source (Supabase limits select to 1000 rows)
    const listingsSources = ['autoscout24', 'mobile.de', 'mobile_de', 'mobilede', 'leboncoin', 'largus', 'lacentrale', 'blocket', 'bilweb', 'bytbil', 'subito', 'gaspedaal', 'marktplaats', 'coches.net', 'finn', 'otomoto'];
    const listingsBySource = {};
    const normalizeListingSource = (s) => (['mobile_de', 'mobilede'].includes(s) ? 'mobile.de' : s);
    for (const src of listingsSources) {
      const count = await safeCount('listings', supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('source_platform', src));
      if (count > 0) {
        const key = normalizeListingSource(src);
        listingsBySource[key] = (listingsBySource[key] || 0) + count;
      }
    }

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
      return {
        source,
        runs_ok: runs.ok,
        runs_pending: runs.pending,
        runs_failed: runs.failed,
        raw_pending: rawPendingBySource[source] || 0,
        queue_urls_pending: isMobileDe ? mobiledeQueuePending : 0,
        queue_urls_processing: isMobileDe ? mobiledeQueueProcessing : 0,
        listings_total: listingsBySource[source] || 0,
        site_total_available: siteTotalsBySource[source] || null,
        last_run: lastRun,
        last_success: lastSuccess,
        crons: cronsForSource
      };
    }).sort((a, b) => a.source.localeCompare(b.source));

    const listingsGrandTotal = await safeCount('listings', supabase
      .from('listings')
      .select('*', { count: 'exact', head: true }));

    return {
      totals: {
        runs_ok: totals.ok,
        runs_pending: totals.pending,
        runs_failed: totals.failed,
        runs_total: totals.ok + totals.pending + totals.failed,
        listings_total: listingsGrandTotal || 0
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







