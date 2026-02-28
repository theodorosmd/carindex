import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

function isMissingTableError(error) {
  if (!error) return false;
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message || '');
}

function isMissingColumnError(error) {
  if (!error) return false;
  return error.code === '42703' || /column .* does not exist/i.test(error.message || '');
}

function shouldReturnEmpty(error) {
  return isMissingTableError(error) || isMissingColumnError(error);
}

function normalizeStatus(status) {
  if (!status) return null;
  const normalized = String(status).toLowerCase();
  if (['running', 'success', 'failed'].includes(normalized)) return normalized;
  return null;
}

async function sendWebhookWithRetry(url, payload, attempts = 3) {
  let lastError = null;
  let lastStatus = null;
  const baseDelayMs = 500;
  const webhookSecret = process.env.INGEST_RUN_WEBHOOK_SECRET;
  const attemptLogs = [];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      let headers = { 'Content-Type': 'application/json' };

      if (webhookSecret) {
        const { createHmac } = await import('crypto');
        const signature = createHmac('sha256', webhookSecret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers = {
          ...headers,
          'X-Carindex-Signature': signature
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        attemptLogs.push({
          attempt,
          status: response.status,
          ok: true,
          at: new Date().toISOString()
        });
        return { success: true, attempts: attemptLogs, lastStatus: response.status, lastError: null };
      }

      lastStatus = response.status;
      lastError = new Error(`Webhook responded with status ${response.status}`);
      logger.warn('Run webhook responded with non-200', {
        url,
        status: response.status,
        attempt
      });
      attemptLogs.push({
        attempt,
        status: response.status,
        ok: false,
        error: lastError.message,
        at: new Date().toISOString()
      });
    } catch (error) {
      lastError = error;
      logger.warn('Failed to send run webhook', { url, error: error.message, attempt });
      attemptLogs.push({
        attempt,
        status: null,
        ok: false,
        error: error.message,
        at: new Date().toISOString()
      });
    }

    if (attempt < attempts) {
      const delay = baseDelayMs * attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  logger.error('Run webhook failed after retries', {
    url,
    error: lastError?.message
  });

  return {
    success: false,
    attempts: attemptLogs,
    lastStatus,
    lastError: lastError?.message || null
  };
}

export async function createScraperRun(input) {
  try {
    const { data, error } = await supabase
      .from('scraper_runs')
      .insert({
        source_platform: input.source_platform,
        status: normalizeStatus(input.status) || 'running',
        started_at: input.started_at || new Date().toISOString(),
        webhook_url: input.webhook_url || null,
        metadata: input.metadata || null
      })
      .select()
      .single();

    if (error) {
      if (shouldReturnEmpty(error)) {
        throw new Error('scraper_runs table missing');
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error creating scraper run', { error: error.message });
    throw error;
  }
}

export async function incrementScraperRunCounters(id) {
  try {
    const { error } = await supabase.rpc('increment_scraper_run_counters', {
      run_uuid: id
    });
    if (error) {
      if (shouldReturnEmpty(error)) return;
      throw error;
    }
  } catch (error) {
    logger.warn('incrementScraperRunCounters', { id, error: error.message });
  }
}

export async function updateScraperRun(id, updates) {
  try {
    const status = normalizeStatus(updates.status);
    const finishedAt = updates.finished_at || (status && status !== 'running' ? new Date().toISOString() : null);

    const { data, error } = await supabase
      .from('scraper_runs')
      .update({
        status: status || undefined,
        finished_at: finishedAt || undefined,
        total_scraped: updates.total_scraped ?? undefined,
        total_saved: updates.total_saved ?? undefined,
        total_failed: updates.total_failed ?? undefined,
        error_message: updates.error_message ?? undefined,
        updated_at: new Date().toISOString(),
        metadata: updates.metadata ?? undefined
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (shouldReturnEmpty(error)) {
        throw new Error('scraper_runs table missing');
      }
      throw error;
    }

    const webhookUrl = updates.webhook_url || data.webhook_url || process.env.INGEST_RUN_WEBHOOK_URL;
    if (webhookUrl && status && status !== 'running') {
      const webhookResult = await sendWebhookWithRetry(webhookUrl, {
        id: data.id,
        source_platform: data.source_platform,
        status: data.status,
        totals: {
          total_scraped: data.total_scraped || 0,
          total_saved: data.total_saved || 0,
          total_failed: data.total_failed || 0
        },
        started_at: data.started_at,
        finished_at: data.finished_at,
        error_message: data.error_message,
        metadata: data.metadata || null
      });

      await supabase
        .from('scraper_runs')
        .update({
          webhook_attempts: webhookResult.attempts,
          webhook_last_status: webhookResult.lastStatus,
          webhook_last_error: webhookResult.lastError,
          webhook_last_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);
    }

    return data;
  } catch (error) {
    logger.error('Error updating scraper run', { error: error.message, id });
    throw error;
  }
}

export async function listScraperRuns({ limit = 50, offset = 0, source_platform, status, started_from, started_to }) {
  try {
    let query = supabase
      .from('scraper_runs')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (source_platform) {
      query = query.eq('source_platform', source_platform);
    }

    const normalizedStatus = normalizeStatus(status);
    if (normalizedStatus) {
      query = query.eq('status', normalizedStatus);
    }

    if (started_from) {
      query = query.gte('started_at', started_from);
    }

    if (started_to) {
      query = query.lte('started_at', started_to);
    }

    const { data, error, count } = await query;

    if (error) {
      if (shouldReturnEmpty(error)) {
        return { runs: [], total: 0 };
      }
      throw error;
    }

    return { runs: data || [], total: count || 0 };
  } catch (error) {
    logger.error('Error listing scraper runs', { error: error.message });
    throw error;
  }
}

export async function listListingsForRun({ run_id, limit = 50, offset = 0 }) {
  try {
    const { data, error, count } = await supabase
      .from('listings')
      .select('id, source_platform, source_listing_id, brand, model, year, price, currency, status, url, last_seen, created_at', { count: 'exact' })
      .eq('run_id', run_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { listings: data || [], total: count || 0 };
  } catch (error) {
    if (shouldReturnEmpty(error)) {
      logger.warn('Run listings query failed, returning empty list', { error: error.message, run_id });
      return { listings: [], total: 0 };
    }
    logger.error('Error listing run listings', { error: error.message, run_id });
    throw error;
  }
}
