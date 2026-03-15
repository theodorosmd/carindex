/**
 * Blog admin API controller — CRUD for blog posts (admin only).
 *
 * All endpoints require auth middleware + admin role.
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// ─── GET /api/v1/blog/posts ───────────────────────────────────────────────────

export async function listPosts(req, res) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, author, tags, status, published_at, meta_title, meta_description, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('blogAdminController listPosts error', { error: error.message });
      return res.status(500).json({ error: error.message });
    }

    res.json({ posts: data || [] });
  } catch (err) {
    logger.error('blogAdminController listPosts error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/v1/blog/posts ──────────────────────────────────────────────────

export async function createPost(req, res) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const {
    title, slug, excerpt, content, cover_image,
    author, tags, status, meta_title, meta_description,
  } = req.body;

  if (!title || !slug) {
    return res.status(400).json({ error: 'title and slug are required' });
  }

  try {
    const now = new Date().toISOString();
    const published_at = status === 'published' ? now : null;

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        slug,
        excerpt: excerpt || null,
        content: content || '',
        cover_image: cover_image || null,
        author: author || 'Carindex',
        tags: Array.isArray(tags) ? tags : [],
        status: status || 'draft',
        published_at,
        meta_title: meta_title || null,
        meta_description: meta_description || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('blogAdminController createPost error', { error: error.message });
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ post: data });
  } catch (err) {
    logger.error('blogAdminController createPost error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PUT /api/v1/blog/posts/:id ───────────────────────────────────────────────

export async function updatePost(req, res) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;
  const {
    title, slug, excerpt, content, cover_image,
    author, tags, status, meta_title, meta_description,
  } = req.body;

  try {
    // Fetch current post to check published_at state
    const { data: existing, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, status, published_at')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const now = new Date().toISOString();
    // Auto-set published_at when transitioning to published for the first time
    let published_at = existing.published_at;
    if (status === 'published' && !existing.published_at) {
      published_at = now;
    }

    const updates = {
      updated_at: now,
    };
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (excerpt !== undefined) updates.excerpt = excerpt;
    if (content !== undefined) updates.content = content;
    if (cover_image !== undefined) updates.cover_image = cover_image;
    if (author !== undefined) updates.author = author;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (status !== undefined) updates.status = status;
    if (meta_title !== undefined) updates.meta_title = meta_title;
    if (meta_description !== undefined) updates.meta_description = meta_description;
    if (published_at !== existing.published_at) updates.published_at = published_at;

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('blogAdminController updatePost error', { error: error.message });
      return res.status(400).json({ error: error.message });
    }

    res.json({ post: data });
  } catch (err) {
    logger.error('blogAdminController updatePost error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE /api/v1/blog/posts/:id ───────────────────────────────────────────

export async function deletePost(req, res) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('blogAdminController deletePost error', { error: error.message });
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error('blogAdminController deletePost error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST /api/v1/blog/posts/:id/publish ─────────────────────────────────────

export async function publishPost(req, res) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, published_at')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        status: 'published',
        published_at: existing.published_at || now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('blogAdminController publishPost error', { error: error.message });
      return res.status(400).json({ error: error.message });
    }

    res.json({ post: data });
  } catch (err) {
    logger.error('blogAdminController publishPost error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}
