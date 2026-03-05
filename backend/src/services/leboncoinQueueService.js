/**
 * Queue Leboncoin pour fetcher les détails en parallèle.
 * Table: leboncoin_fetch_queue
 * Phase recherche ajoute des URLs, workers fetchent chaque page détail via scrape.do.
 */
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const LOCK_DURATION_MINUTES = 30;

/**
 * Ajouter des URLs à la queue
 * @param {Array<{url: string, title?: string, brand?: string, model?: string, year?: number, price?: number, mileage?: number}>} items
 * @returns {{ added: number, skipped: number }}
 */
export async function addToQueue(items) {
  let added = 0;
  let skipped = 0;

  for (const item of items) {
    const url = item.url || item.link;
    if (!url) {
      skipped++;
      continue;
    }

    const { data: existing } = await supabase
      .from('leboncoin_fetch_queue')
      .select('id, status')
      .eq('url', url)
      .maybeSingle();

    if (existing && ['ok', 'OK', 'done', 'gone'].includes(existing.status)) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('leboncoin_fetch_queue')
      .upsert(
        {
          url,
          title: item.title || null,
          brand: item.brand || null,
          model: item.model || null,
          year: item.year ?? null,
          price: item.price ?? null,
          mileage: item.mileage ?? null,
          status: 'pending',
          retry_count: 0,
          next_retry_at: null,
          last_error: null,
          last_attempt_at: null,
          locked_until: null,
          locked_by: null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'url', ignoreDuplicates: false }
      );

    if (error) {
      if (error.code === '23505') {
        skipped++;
      } else {
        logger.warn('Leboncoin queue add error', { url, error: error.message });
        skipped++;
      }
      continue;
    }
    added++;
  }

  return { added, skipped };
}

/**
 * Acquérir le prochain item disponible (lock)
 * @param {string} workerId
 * @returns {Promise<{id: string, url: string, title?: string, brand?: string, model?: string, year?: number, price?: number, mileage?: number} | null>}
 */
export async function acquireNext(workerId) {
  const now = new Date().toISOString();
  const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from('leboncoin_fetch_queue')
    .select('id, url, title, brand, model, year, price, mileage, status')
    .in('status', ['pending', 'retry'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .or(`locked_until.is.null,locked_until.lt.${now}`)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !rows || rows.length === 0) return null;

  const row = rows[0];

  const { data: updated, error: updateError } = await supabase
    .from('leboncoin_fetch_queue')
    .update({
      status: 'processing',
      last_attempt_at: now,
      locked_until: lockUntil,
      locked_by: workerId,
      updated_at: now
    })
    .eq('id', row.id)
    .eq('status', row.status)
    .select('id, url, title, brand, model, year, price, mileage')
    .maybeSingle();

  if (updateError || !updated) return null;

  return {
    id: updated.id,
    url: updated.url,
    title: updated.title,
    brand: updated.brand,
    model: updated.model,
    year: updated.year,
    price: updated.price,
    mileage: updated.mileage
  };
}

/**
 * Marquer comme OK (succès) ou Error/Retry
 */
export async function releaseItem(id, status, options = {}) {
  const { retryCount = 0, nextRetryAt = null, lastError = null } = options;
  const now = new Date().toISOString();

  const updates = {
    status,
    locked_until: null,
    locked_by: null,
    updated_at: now
  };
  if (status === 'retry') {
    updates.retry_count = retryCount;
    updates.next_retry_at = nextRetryAt;
    updates.last_error = lastError;
    updates.last_attempt_at = now;
  } else if (status === 'ok' || status === 'error' || status === 'gone') {
    updates.last_attempt_at = now;
    updates.last_error = lastError;
  }

  await supabase.from('leboncoin_fetch_queue').update(updates).eq('id', id);
}
