import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const MAX_SAVED_SEARCHES = 10; // per user

export async function listSavedSearches(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('id, name, filters, alert_email, new_count, last_checked, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    logger.error('listSavedSearches error', { error: err.message });
    next(err);
  }
}

export async function createSavedSearch(req, res, next) {
  try {
    const userId = req.user.id;

    // Enforce per-user limit
    const { count } = await supabase
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count >= MAX_SAVED_SEARCHES) {
      return res.status(429).json({
        error: `Maximum ${MAX_SAVED_SEARCHES} saved searches allowed. Delete one to add another.`
      });
    }

    const { name, filters, alert_email = false } = req.body;

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({ user_id: userId, name, filters, alert_email })
      .select('id, name, filters, alert_email, new_count, created_at')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    logger.error('createSavedSearch error', { error: err.message });
    next(err);
  }
}

export async function updateSavedSearch(req, res, next) {
  try {
    const { id } = req.params;
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.filters !== undefined) updates.filters = req.body.filters;
    if (req.body.alert_email !== undefined) updates.alert_email = req.body.alert_email;
    updates.updated_at = new Date().toISOString();
    // Reset new_count when user explicitly views/updates
    if (req.body.mark_seen) updates.new_count = 0;

    const { data, error } = await supabase
      .from('saved_searches')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    logger.error('updateSavedSearch error', { error: err.message });
    next(err);
  }
}

export async function deleteSavedSearch(req, res, next) {
  try {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    logger.error('deleteSavedSearch error', { error: err.message });
    next(err);
  }
}
