/**
 * Blog SSR controller — server-rendered HTML pages for Google indexing.
 *
 * Routes:
 *   GET /blog            → blog listing page
 *   GET /blog/:slug      → single blog post page
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

const SITE_URL = process.env.SITE_URL || 'https://getcarindex.com';
const PAGE_SIZE = 20;

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── shared layout ────────────────────────────────────────────────────────────

function navHtml(crumbs = []) {
  const breadcrumb = crumbs.length
    ? `<nav class="max-w-6xl mx-auto px-6 py-3 text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
        <a href="/" class="hover:text-zinc-600">Accueil</a>
        ${crumbs.map(([label, href]) => `<span>›</span>${href ? `<a href="${href}" class="hover:text-zinc-600">${label}</a>` : `<span class="text-zinc-600">${label}</span>`}`).join('')}
      </nav>`
    : '';

  return `
  <header class="border-b border-zinc-200 bg-white sticky top-0 z-10">
    <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <div class="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
          <span class="text-white font-bold text-xs">C</span>
        </div>
        <span class="font-semibold text-sm text-zinc-900">Carindex</span>
      </a>
      <nav class="hidden md:flex items-center gap-6 text-sm text-zinc-500">
        <a href="/prix-marche" class="hover:text-zinc-900">Prix du marché</a>
        <a href="/blog" class="hover:text-zinc-900">Blog</a>
        <a href="/pricing" class="hover:text-zinc-900">Tarifs</a>
      </nav>
      <a href="/#/search" class="bg-zinc-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-zinc-700 transition">
        Rechercher →
      </a>
    </div>
  </header>
  ${breadcrumb}`;
}

function footerHtml(extraLinks = []) {
  return `
  <footer class="border-t border-zinc-100 mt-16 py-8 px-6 bg-white">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
      <p>© ${new Date().getFullYear()} Carindex — Intelligence marché automobile • 13 pays européens</p>
      <div class="flex items-center gap-5">
        <a href="/prix-marche" class="hover:text-zinc-600">Prix du marché</a>
        <a href="/blog" class="hover:text-zinc-600">Blog</a>
        ${extraLinks.map(([label, href]) => `<a href="${href}" class="hover:text-zinc-600">${label}</a>`).join('')}
        <a href="/pricing" class="hover:text-zinc-600">Tarifs</a>
        <a href="/" class="hover:text-zinc-600">Accueil</a>
      </div>
    </div>
  </footer>`;
}

function htmlShell({ title, description, canonical, ogType = 'website', jsonLd = null }, body) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="Carindex">
  <meta name="robots" content="index, follow">
  <script src="https://cdn.tailwindcss.com"></script>
  ${jsonLd
    ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
        .map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ')
    : ''}
</head>
<body class="bg-white text-zinc-900 antialiased" style="font-family:Inter,system-ui,sans-serif">
  ${body}
</body>
</html>`;
}

function render404Blog() {
  return htmlShell(
    { title: 'Article introuvable | Blog Carindex', description: '', canonical: `${SITE_URL}/blog` },
    `
    ${navHtml([['Blog', '/blog']])}
    <main class="max-w-2xl mx-auto px-6 py-24 text-center">
      <h1 class="text-2xl font-bold text-zinc-900 mb-3">Article introuvable</h1>
      <p class="text-zinc-500 mb-8">Cet article n'existe pas ou n'est plus disponible.</p>
      <a href="/blog" class="bg-zinc-900 text-white font-semibold px-6 py-3 rounded-lg text-sm hover:bg-zinc-700 transition">
        Voir tous les articles →
      </a>
    </main>
    ${footerHtml()}
    `
  );
}

// ─── GET /blog ─────────────────────────────────────────────────────────────────

export async function getBlogListing(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const { data: posts, error, count } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, author, tags, published_at', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      logger.error('blogController getBlogListing error', { error: error.message });
      return res.status(500).send('<h1>Erreur serveur</h1>');
    }

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
    const canonicalUrl = page > 1 ? `${SITE_URL}/blog?page=${page}` : `${SITE_URL}/blog`;
    const title = 'Blog Carindex — Conseils achat voiture, analyses marché';
    const description = 'Conseils pratiques pour acheter une voiture d\'occasion en Europe, analyses des tendances du marché automobile et guides d\'import transfrontalier.';

    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: title,
        description,
        url: `${SITE_URL}/blog`,
        itemListElement: (posts || []).map((p, i) => ({
          '@type': 'ListItem',
          position: offset + i + 1,
          url: `${SITE_URL}/blog/${p.slug}`,
          name: p.title,
        })),
      },
    ];

    const paginationHtml = totalPages > 1 ? `
    <div class="flex items-center justify-center gap-2 mt-12">
      ${page > 1 ? `<a href="/blog?page=${page - 1}" class="px-4 py-2 border border-zinc-200 rounded-lg text-sm hover:border-zinc-900 transition">← Précédent</a>` : ''}
      <span class="text-sm text-zinc-500">Page ${page} / ${totalPages}</span>
      ${page < totalPages ? `<a href="/blog?page=${page + 1}" class="px-4 py-2 border border-zinc-200 rounded-lg text-sm hover:border-zinc-900 transition">Suivant →</a>` : ''}
    </div>` : '';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    res.send(htmlShell(
      { title, description, canonical: canonicalUrl, jsonLd },
      `
      ${navHtml([['Blog', null]])}

      <main class="max-w-6xl mx-auto px-6 pt-8 pb-16">

        <!-- Hero -->
        <div class="mb-12">
          <h1 class="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">
            Blog Carindex
          </h1>
          <p class="text-zinc-500 text-base max-w-2xl">${description}</p>
        </div>

        <!-- Articles grid -->
        ${posts && posts.length > 0 ? `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          ${posts.map(p => `
          <article class="group border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-400 hover:shadow-lg transition-all duration-200 bg-white flex flex-col">
            ${p.cover_image ? `
            <div class="aspect-[16/9] bg-zinc-100 overflow-hidden flex-shrink-0">
              <img src="${p.cover_image}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">
            </div>` : ''}
            <div class="p-5 flex flex-col flex-1">
              ${p.tags && p.tags.length > 0 ? `
              <div class="flex flex-wrap gap-1.5 mb-3">
                ${p.tags.slice(0, 3).map(tag => `<span class="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">${tag}</span>`).join('')}
              </div>` : ''}
              <h2 class="text-base font-semibold text-zinc-900 leading-snug mb-2 group-hover:text-zinc-600 transition">
                <a href="/blog/${p.slug}">${p.title}</a>
              </h2>
              ${p.excerpt ? `<p class="text-sm text-zinc-500 leading-relaxed mb-4 flex-1">${p.excerpt}</p>` : '<div class="flex-1"></div>'}
              <div class="flex items-center justify-between mt-auto pt-3 border-t border-zinc-100">
                <span class="text-xs text-zinc-400">${p.author || 'Carindex'} · ${formatDate(p.published_at)}</span>
                <a href="/blog/${p.slug}" class="text-xs font-semibold text-zinc-900 hover:text-zinc-600 transition">Lire →</a>
              </div>
            </div>
          </article>`).join('')}
        </div>
        ${paginationHtml}
        ` : `
        <div class="text-center py-24">
          <p class="text-zinc-400 text-lg">Aucun article pour le moment.</p>
          <p class="text-zinc-400 text-sm mt-2">Revenez bientôt !</p>
        </div>`}

        <!-- CTA -->
        <section class="bg-zinc-950 rounded-2xl p-8 md:p-12 text-center mt-16">
          <h2 class="text-2xl font-bold text-white mb-3">Trouvez la meilleure affaire automobile</h2>
          <p class="text-zinc-400 text-sm mb-8 max-w-md mx-auto">
            Accédez au prix de marché exact, aux scores de bonne affaire et aux alertes de baisse de prix sur 13 marchés européens.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/#/search" class="bg-white text-zinc-900 font-semibold px-6 py-3 rounded-lg text-sm hover:bg-zinc-100 transition">
              Rechercher une voiture →
            </a>
            <a href="/pricing" class="border border-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg text-sm hover:border-zinc-400 hover:text-white transition">
              Voir les tarifs
            </a>
          </div>
        </section>

      </main>

      ${footerHtml()}
      `
    ));
  } catch (err) {
    logger.error('blogController getBlogListing error', { error: err.message });
    res.status(500).send('<h1>Erreur serveur</h1>');
  }
}

// ─── GET /blog/:slug ───────────────────────────────────────────────────────────

export async function getBlogPost(req, res) {
  const { slug } = req.params;

  try {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !post) {
      return res.status(404).send(render404Blog());
    }

    // Related posts (3 most recent other published posts)
    const { data: related } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, cover_image, author, published_at, tags')
      .eq('status', 'published')
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(3);

    const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
    const metaTitle = post.meta_title || `${post.title} | Blog Carindex`;
    const metaDescription = post.meta_description || post.excerpt || `${post.title} — Carindex Blog`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: metaDescription,
      url: canonicalUrl,
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      author: {
        '@type': 'Organization',
        name: post.author || 'Carindex',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Carindex',
        url: SITE_URL,
      },
      ...(post.cover_image && { image: post.cover_image }),
    };

    const relatedHtml = related && related.length > 0 ? `
    <aside class="mt-12 pt-10 border-t border-zinc-100">
      <h3 class="text-lg font-bold text-zinc-900 mb-6">Articles récents</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        ${related.map(r => `
        <article class="group">
          ${r.cover_image ? `
          <div class="aspect-[16/9] bg-zinc-100 rounded-lg overflow-hidden mb-3">
            <img src="${r.cover_image}" alt="${r.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">
          </div>` : ''}
          <h4 class="text-sm font-semibold text-zinc-900 leading-snug mb-1 group-hover:text-zinc-600 transition">
            <a href="/blog/${r.slug}">${r.title}</a>
          </h4>
          <p class="text-xs text-zinc-400">${r.author || 'Carindex'} · ${formatDate(r.published_at)}</p>
        </article>`).join('')}
      </div>
    </aside>` : '';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    res.send(htmlShell(
      { title: metaTitle, description: metaDescription, canonical: canonicalUrl, ogType: 'article', jsonLd },
      `
      ${navHtml([['Blog', '/blog'], [post.title, null]])}

      <main class="max-w-3xl mx-auto px-6 pt-8 pb-16">

        <!-- Article header -->
        <header class="mb-8">
          ${post.tags && post.tags.length > 0 ? `
          <div class="flex flex-wrap gap-2 mb-4">
            ${post.tags.map(tag => `<span class="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full font-medium">${tag}</span>`).join('')}
          </div>` : ''}
          <h1 class="text-3xl md:text-4xl font-bold text-zinc-900 leading-tight mb-4">
            ${post.title}
          </h1>
          ${post.excerpt ? `<p class="text-lg text-zinc-500 leading-relaxed mb-5">${post.excerpt}</p>` : ''}
          <div class="flex items-center gap-3 text-sm text-zinc-400">
            <span class="font-medium text-zinc-600">${post.author || 'Carindex'}</span>
            <span>·</span>
            <time datetime="${post.published_at}">${formatDate(post.published_at)}</time>
          </div>
        </header>

        <!-- Cover image -->
        ${post.cover_image ? `
        <div class="mb-10 rounded-xl overflow-hidden">
          <img src="${post.cover_image}" alt="${post.title}" class="w-full object-cover" style="max-height:400px;">
        </div>` : ''}

        <!-- Article content -->
        <div class="prose prose-zinc prose-base max-w-none leading-relaxed">
          ${post.content}
        </div>

        <!-- Related posts -->
        ${relatedHtml}

        <!-- CTA -->
        <section class="bg-zinc-950 rounded-2xl p-8 text-center mt-14">
          <h2 class="text-xl font-bold text-white mb-3">Passez à l'action</h2>
          <p class="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            Comparez les prix en temps réel sur 13 marchés européens. Prix de marché, score de bonne affaire et alertes — gratuit.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/#/search" class="bg-white text-zinc-900 font-semibold px-6 py-3 rounded-lg text-sm hover:bg-zinc-100 transition">
              Rechercher une voiture →
            </a>
            <a href="/blog" class="border border-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg text-sm hover:border-zinc-400 hover:text-white transition">
              Voir tous les articles
            </a>
          </div>
        </section>

      </main>

      ${footerHtml()}
      `
    ));
  } catch (err) {
    logger.error('blogController getBlogPost error', { error: err.message, slug });
    res.status(500).send('<h1>Erreur serveur</h1>');
  }
}
