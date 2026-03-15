/**
 * Programmatic SEO — server-rendered HTML pages for Google indexing.
 *
 * Routes:
 *   GET /sitemap.xml                        → sitemap for all brand/model pairs
 *   GET /prix-marche                        → overview hub
 *   GET /prix-marche/:brand                 → brand hub (all models)
 *   GET /prix-marche/:brand/:model          → market price page (main SEO page)
 */

import { supabase } from '../config/supabase.js';
import { toEUR } from '../config/aggregateCountries.js';
import { logger } from '../utils/logger.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

const SITE_URL = process.env.SITE_URL || 'https://getcarindex.com';

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function formatPrice(price) {
  if (!price) return '–';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price);
}

function formatNum(n) {
  return new Intl.NumberFormat('fr-FR').format(n);
}

const COUNTRY_NAMES = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', NL: 'Pays-Bas',
  IT: 'Italie', ES: 'Espagne', SE: 'Suède', NO: 'Norvège',
  FI: 'Finlande', DK: 'Danemark', CH: 'Suisse', LU: 'Luxembourg', PL: 'Pologne',
};

function getImage(images) {
  if (Array.isArray(images) && images.length > 0) return images[0];
  if (typeof images === 'string') {
    try { const arr = JSON.parse(images); if (arr?.[0]) return arr[0]; } catch {}
    if (images.startsWith('http')) return images;
  }
  return null;
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
        ${extraLinks.map(([label, href]) => `<a href="${href}" class="hover:text-zinc-600">${label}</a>`).join('')}
        <a href="/pricing" class="hover:text-zinc-600">Tarifs</a>
        <a href="/" class="hover:text-zinc-600">Accueil</a>
      </div>
    </div>
  </footer>`;
}

function htmlShell({ title, description, canonical, jsonLd = null }, body) {
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
  <meta property="og:type" content="website">
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

// ─── GET /prix-marche/:brand/:model ───────────────────────────────────────────

export async function getBrandModelPage(req, res) {
  const { brand: brandSlug, model: modelSlug } = req.params;
  const brandSearch = brandSlug.replace(/-/g, ' ');
  const modelSearch = modelSlug.replace(/-/g, ' ');

  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, brand, model, year, price, location_country, currency, mileage, price_drop_pct, images, url, fuel_type')
      .eq('status', 'active')
      .ilike('brand', `%${brandSearch}%`)
      .ilike('model', `%${modelSearch}%`)
      .order('price_drop_pct', { ascending: false, nullsFirst: false })
      .limit(500);

    if (error) {
      logger.error('seoController getBrandModelPage error', { error: error.message, brandSearch, modelSearch });
      return res.status(404).send(render404(brandSearch, modelSearch));
    }
    if (!listings?.length) {
      return res.status(404).send(render404(brandSearch, modelSearch));
    }

    const realBrand = listings[0].brand;
    const realModel = listings[0].model;

    // Price stats
    const prices = listings
      .map(l => toEUR(l.price, l.location_country, l.currency))
      .filter(p => p > 500 && p < 600000);
    const avg = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : null;
    const min = prices.length ? Math.round(Math.min(...prices)) : null;
    const max = prices.length ? Math.round(Math.max(...prices)) : null;

    // Years
    const years = listings.map(l => l.year).filter(y => y > 1990 && y <= new Date().getFullYear() + 1);
    const minYear = years.length ? Math.min(...years) : null;
    const maxYear = years.length ? Math.max(...years) : null;

    // Top 6 deals
    const topDeals = listings
      .filter(l => l.price > 0 && l.url)
      .slice(0, 6)
      .map(l => ({
        brand: l.brand,
        model: l.model,
        year: l.year,
        price: toEUR(l.price, l.location_country, l.currency),
        mileage: l.mileage,
        country: l.location_country,
        dropPct: l.price_drop_pct,
        image: getImage(l.images),
        url: l.url,
      }));

    // Country distribution
    const countryCounts = {};
    listings.forEach(l => { if (l.location_country) countryCounts[l.location_country] = (countryCounts[l.location_country] || 0) + 1; });
    const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Related models (same brand, different models)
    const { data: relatedData } = await supabase
      .from('listings')
      .select('model')
      .eq('status', 'active')
      .ilike('brand', brandSearch)
      .not('model', 'ilike', `%${modelSearch}%`)
      .limit(200);

    const relatedCounts = {};
    relatedData?.forEach(l => { if (l.model) relatedCounts[l.model] = (relatedCounts[l.model] || 0) + 1; });
    const relatedModels = Object.entries(relatedCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([model]) => ({ model, slug: slugify(model) }));

    // Comparable models from other brands (similar avg price ±30%)
    let comparableModels = [];
    if (avg) {
      const priceMin = Math.round(avg * 0.7);
      const priceMax = Math.round(avg * 1.3);
      const { data: compData } = await supabase
        .from('listings')
        .select('brand, model, price, location_country, currency')
        .eq('status', 'active')
        .not('brand', 'ilike', `%${brandSearch}%`)
        .gte('price', priceMin * 0.8)
        .lte('price', priceMax * 1.2)
        .limit(600);

      if (compData?.length) {
        const compMap = {};
        compData.forEach(l => {
          const key = `${l.brand}|${l.model}`;
          if (!compMap[key]) compMap[key] = { brand: l.brand, model: l.model, prices: [], count: 0 };
          const p = toEUR(l.price, l.location_country, l.currency);
          if (p > 500) { compMap[key].prices.push(p); compMap[key].count++; }
        });
        comparableModels = Object.values(compMap)
          .filter(m => m.count >= 3)
          .map(m => ({ ...m, avg: Math.round(m.prices.reduce((s, p) => s + p, 0) / m.prices.length) }))
          .filter(m => m.avg >= priceMin && m.avg <= priceMax)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .map(m => ({ brand: m.brand, model: m.model, avg: m.avg, slug: `${slugify(m.brand)}/${slugify(m.model)}` }));
      }
    }

    // Extra stats for editorial & FAQ
    const fuelCounts = {};
    listings.forEach(l => { if (l.fuel_type) fuelCounts[l.fuel_type] = (fuelCounts[l.fuel_type] || 0) + 1; });
    const topFuel = Object.entries(fuelCounts).sort((a, b) => b[1] - a[1]);
    const dominantFuel = topFuel[0]?.[0];
    const dominantFuelPct = topFuel[0] ? Math.round((topFuel[0][1] / listings.length) * 100) : null;

    const withDrops = listings.filter(l => l.price_drop_pct > 0).length;
    const dropPct = listings.length ? Math.round((withDrops / listings.length) * 100) : 0;

    // Country avg prices for editorial insight
    const countryPrices = {};
    listings.forEach(l => {
      if (!l.location_country) return;
      const p = toEUR(l.price, l.location_country, l.currency);
      if (p > 500) {
        if (!countryPrices[l.location_country]) countryPrices[l.location_country] = [];
        countryPrices[l.location_country].push(p);
      }
    });
    const countryAvgs = Object.entries(countryPrices)
      .filter(([, prices]) => prices.length >= 3)
      .map(([code, prices]) => ({ code, avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length), count: prices.length }))
      .sort((a, b) => a.avg - b.avg);
    const cheapestCountry = countryAvgs[0];
    const mostExpensive = countryAvgs[countryAvgs.length - 1];

    // Median mileage
    const mileages = listings.map(l => l.mileage).filter(m => m > 0 && m < 500000).sort((a, b) => a - b);
    const medianMileage = mileages.length ? mileages[Math.floor(mileages.length / 2)] : null;

    // Most common years
    const yearCounts = {};
    years.forEach(y => { yearCounts[y] = (yearCounts[y] || 0) + 1; });
    const topYears = Object.entries(yearCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([y]) => y);

    const canonicalUrl = `${SITE_URL}/prix-marche/${brandSlug}/${modelSlug}`;
    const description = avg
      ? `Prix moyen ${realBrand} ${realModel} : ${formatPrice(avg)} (basé sur ${listings.length} annonces). Évolution des prix, meilleures offres du moment sur 13 marchés européens.`
      : `${listings.length} annonces ${realBrand} ${realModel} d'occasion en Europe. Comparez les prix, accédez aux scores de bonne affaire et aux alertes de prix.`;

    const faqItems = [
      {
        q: `Quel est le prix moyen d'une ${realBrand} ${realModel} d'occasion ?`,
        a: avg
          ? `Le prix moyen d'une ${realBrand} ${realModel} d'occasion est de ${formatPrice(avg)}, basé sur ${formatNum(listings.length)} annonces actives en Europe. Les prix varient de ${formatPrice(min)} à ${formatPrice(max)} selon l'année, le kilométrage et l'état.`
          : `Le prix d'une ${realBrand} ${realModel} d'occasion varie selon l'année et le kilométrage. Carindex suit ${formatNum(listings.length)} annonces actives pour vous donner l'estimation la plus précise.`,
      },
      cheapestCountry && mostExpensive && cheapestCountry.code !== mostExpensive.code ? {
        q: `Où acheter une ${realBrand} ${realModel} d'occasion au meilleur prix en Europe ?`,
        a: `${COUNTRY_NAMES[cheapestCountry.code] || cheapestCountry.code} propose les prix les plus compétitifs pour la ${realBrand} ${realModel}, avec un prix moyen de ${formatPrice(cheapestCountry.avg)}. ${COUNTRY_NAMES[mostExpensive.code] || mostExpensive.code} affiche les prix les plus élevés (${formatPrice(mostExpensive.avg)} en moyenne). L'écart est de ${formatPrice(mostExpensive.avg - cheapestCountry.avg)}.`,
      } : null,
      medianMileage ? {
        q: `Quel kilométrage attendre pour une ${realBrand} ${realModel} d'occasion ?`,
        a: `Le kilométrage médian d'une ${realBrand} ${realModel} d'occasion sur le marché européen est de ${formatNum(medianMileage)} km. Les véhicules avec moins de ${formatNum(Math.round(medianMileage * 0.5))} km sont généralement plus rares et affichent un prix plus élevé.`,
      } : null,
      topYears.length ? {
        q: `Quelle année de ${realBrand} ${realModel} est la plus disponible ?`,
        a: `Les millésimes les plus représentés sur le marché d'occasion pour la ${realBrand} ${realModel} sont ${topYears.join(', ')}. ${minYear && maxYear ? `L'offre couvre les années ${minYear} à ${maxYear}.` : ''}`,
      } : null,
      dropPct > 0 ? {
        q: `Y a-t-il des baisses de prix récentes sur la ${realBrand} ${realModel} ?`,
        a: `${dropPct}% des annonces ${realBrand} ${realModel} actuellement en ligne ont enregistré une baisse de prix récente. Carindex détecte automatiquement ces opportunités et vous permet de créer des alertes pour être notifié dès qu'une annonce baisse de prix.`,
      } : null,
    ].filter(Boolean);

    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Prix du marché', item: `${SITE_URL}/prix-marche` },
          { '@type': 'ListItem', position: 3, name: realBrand, item: `${SITE_URL}/prix-marche/${brandSlug}` },
          { '@type': 'ListItem', position: 4, name: `${realBrand} ${realModel}`, item: canonicalUrl },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${realBrand} ${realModel} d'occasion`,
        description,
        ...(avg && {
          offers: {
            '@type': 'AggregateOffer',
            lowPrice: String(min),
            highPrice: String(max),
            priceCurrency: 'EUR',
            offerCount: String(listings.length),
          },
        }),
      },
      faqItems.length ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      } : null,
    ].filter(Boolean);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(htmlShell(
      { title: `${realBrand} ${realModel} d'occasion — Prix du marché | Carindex`, description, canonical: canonicalUrl, jsonLd },
      `
      ${navHtml([
        ['Prix du marché', '/prix-marche'],
        [realBrand, `/prix-marche/${brandSlug}`],
        [realModel, null],
      ])}

      <main class="max-w-6xl mx-auto px-6 pt-8 pb-16">

        <!-- Hero -->
        <div class="mb-10">
          <h1 class="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">
            ${realBrand} ${realModel} d'occasion — Prix du marché
          </h1>
          <p class="text-zinc-500 text-base max-w-2xl">${description}</p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          ${avg ? `<div class="bg-zinc-50 rounded-xl p-5 border border-zinc-100">
            <p class="text-xs text-zinc-400 uppercase tracking-wide mb-1.5">Prix moyen</p>
            <p class="text-2xl font-bold text-zinc-900">${formatPrice(avg)}</p>
          </div>` : ''}
          <div class="bg-zinc-50 rounded-xl p-5 border border-zinc-100">
            <p class="text-xs text-zinc-400 uppercase tracking-wide mb-1.5">Annonces actives</p>
            <p class="text-2xl font-bold text-zinc-900">${formatNum(listings.length)}</p>
          </div>
          ${min ? `<div class="bg-zinc-50 rounded-xl p-5 border border-zinc-100">
            <p class="text-xs text-zinc-400 uppercase tracking-wide mb-1.5">À partir de</p>
            <p class="text-2xl font-bold text-zinc-900">${formatPrice(min)}</p>
          </div>` : ''}
          ${minYear && maxYear ? `<div class="bg-zinc-50 rounded-xl p-5 border border-zinc-100">
            <p class="text-xs text-zinc-400 uppercase tracking-wide mb-1.5">Millésimes</p>
            <p class="text-2xl font-bold text-zinc-900">${minYear}–${maxYear}</p>
          </div>` : ''}
        </div>

        <!-- Top deals -->
        ${topDeals.length ? `
        <section class="mb-14">
          <h2 class="text-xl font-bold text-zinc-900 mb-5">Meilleures offres ${realBrand} ${realModel} du moment</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            ${topDeals.map(d => `
            <a href="${d.url}" target="_blank" rel="noopener nofollow"
               class="group border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-400 hover:shadow-lg transition-all duration-200 bg-white flex flex-col">
              <div class="aspect-[16/10] bg-zinc-100 overflow-hidden flex-shrink-0">
                ${d.image
                  ? `<img src="${d.image}" alt="${d.brand} ${d.model} ${d.year || ''}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">`
                  : `<div class="w-full h-full flex items-center justify-center"><svg class="w-10 h-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5"/><path d="M3 9l4-4 4 4 4-4 4 4" stroke-width="1.5"/></svg></div>`}
              </div>
              <div class="p-4 flex flex-col flex-1">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <p class="text-sm font-semibold text-zinc-900 leading-tight">${d.brand} ${d.model}${d.year ? ` (${d.year})` : ''}</p>
                  ${d.dropPct > 0 ? `<span class="shrink-0 text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">−${Math.round(d.dropPct)}%</span>` : ''}
                </div>
                <div class="flex items-end justify-between mt-auto">
                  <p class="text-xl font-bold text-zinc-900">${formatPrice(d.price)}</p>
                  <div class="text-right">
                    ${d.mileage ? `<p class="text-xs text-zinc-400">${formatNum(d.mileage)} km</p>` : ''}
                    ${d.country ? `<p class="text-xs text-zinc-400">${COUNTRY_NAMES[d.country] || d.country}</p>` : ''}
                  </div>
                </div>
              </div>
            </a>`).join('')}
          </div>
          <p class="mt-4 text-xs text-zinc-400">Les annonces sont mises à jour quotidiennement. Prix en EUR, conversion selon taux en vigueur.</p>
        </section>` : ''}

        <!-- Country distribution -->
        ${topCountries.length > 1 ? `
        <section class="mb-14">
          <h2 class="text-xl font-bold text-zinc-900 mb-5">Où trouver une ${realBrand} ${realModel} d'occasion ?</h2>
          <div class="flex flex-wrap gap-3">
            ${topCountries.map(([code, n]) => `
            <a href="/${brandSlug}/${modelSlug}?country=${code}" class="flex items-center gap-2.5 bg-zinc-50 border border-zinc-200 hover:border-zinc-400 rounded-xl px-4 py-3 transition">
              <span class="text-sm font-medium text-zinc-800">${COUNTRY_NAMES[code] || code}</span>
              <span class="text-xs text-zinc-400 bg-white border border-zinc-100 rounded-full px-2 py-0.5">${formatNum(n)}</span>
            </a>`).join('')}
          </div>
        </section>` : ''}

        <!-- Dynamic editorial analysis -->
        <section class="mb-14 prose prose-sm prose-zinc max-w-none">
          <h2>Analyse du marché : ${realBrand} ${realModel} d'occasion en Europe</h2>
          <p>
            Le prix moyen d'une <strong>${realBrand} ${realModel}</strong> d'occasion en Europe est de <strong>${avg ? formatPrice(avg) : 'variable'}</strong>,
            basé sur <strong>${formatNum(listings.length)} annonces actives</strong> collectées en temps réel sur 13 marchés européens.
            ${min && max ? `Les prix s'échelonnent de <strong>${formatPrice(min)}</strong> à <strong>${formatPrice(max)}</strong> selon l'année, le kilométrage et l'état du véhicule.` : ''}
          </p>
          ${cheapestCountry && mostExpensive && cheapestCountry.code !== mostExpensive.code ? `
          <p>
            <strong>Arbitrage géographique :</strong> ${COUNTRY_NAMES[cheapestCountry.code] || cheapestCountry.code} est actuellement le marché le plus compétitif
            pour la ${realBrand} ${realModel}, avec un prix moyen de <strong>${formatPrice(cheapestCountry.avg)}</strong>
            (${formatNum(cheapestCountry.count)} annonces).
            À l'inverse, ${COUNTRY_NAMES[mostExpensive.code] || mostExpensive.code} affiche les prix les plus élevés
            (<strong>${formatPrice(mostExpensive.avg)}</strong> en moyenne), soit un écart de <strong>${formatPrice(mostExpensive.avg - cheapestCountry.avg)}</strong> —
            une opportunité d'import à considérer selon votre situation fiscale.
          </p>` : ''}
          ${dominantFuel && dominantFuelPct ? `
          <p>
            <strong>Motorisation :</strong> ${dominantFuelPct}% des ${realBrand} ${realModel} d'occasion disponibles sont à
            motorisation <strong>${dominantFuel.toLowerCase()}</strong>.
            ${topFuel.length > 1 ? `Les autres motorisations représentées sont : ${topFuel.slice(1, 3).map(([f, n]) => `${f.toLowerCase()} (${Math.round(n / listings.length * 100)}%)`).join(', ')}.` : ''}
          </p>` : ''}
          ${medianMileage ? `
          <p>
            <strong>Kilométrage :</strong> Le kilométrage médian sur le marché est de <strong>${formatNum(medianMileage)} km</strong>.
            Les exemplaires sous les ${formatNum(Math.round(medianMileage * 0.6))} km se négocient généralement avec une prime de prix significative.
          </p>` : ''}
          ${dropPct > 5 ? `
          <p>
            <strong>Tendance des prix :</strong> ${dropPct}% des annonces ${realBrand} ${realModel} actuellement en ligne ont enregistré une baisse de prix récente.
            Activez une alerte Carindex pour être notifié dès qu'une annonce correspondant à vos critères baisse de prix.
          </p>` : ''}
          ${minYear && maxYear ? `
          <p>
            Les millésimes disponibles couvrent de <strong>${minYear}</strong> à <strong>${maxYear}</strong>.
            ${topYears.length ? `Les années les plus représentées sur le marché sont ${topYears.slice(0, 3).join(', ')}.` : ''}
          </p>` : ''}
        </section>

        <!-- FAQ -->
        ${faqItems.length ? `
        <section class="mb-14">
          <h2 class="text-xl font-bold text-zinc-900 mb-6">Questions fréquentes — ${realBrand} ${realModel} d'occasion</h2>
          <div class="space-y-4">
            ${faqItems.map(({ q, a }) => `
            <details class="border border-zinc-200 rounded-xl overflow-hidden group">
              <summary class="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-zinc-900 hover:bg-zinc-50 transition list-none">
                <span>${q}</span>
                <svg class="w-4 h-4 text-zinc-400 shrink-0 ml-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </summary>
              <div class="px-5 pb-5 pt-1 text-sm text-zinc-600 leading-relaxed border-t border-zinc-100">${a}</div>
            </details>`).join('')}
          </div>
        </section>` : ''}

        <!-- Related models -->
        ${relatedModels.length ? `
        <section class="mb-14">
          <h2 class="text-xl font-bold text-zinc-900 mb-5">Autres modèles ${realBrand}</h2>
          <div class="flex flex-wrap gap-2">
            ${relatedModels.map(m => `
            <a href="/prix-marche/${brandSlug}/${m.slug}"
               class="border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white rounded-lg px-4 py-2 text-sm font-medium transition">
              ${realBrand} ${m.model}
            </a>`).join('')}
          </div>
        </section>` : ''}

        <!-- Comparable models from other brands -->
        ${comparableModels.length ? `
        <section class="mb-14">
          <h2 class="text-xl font-bold text-zinc-900 mb-2">Alternatives à la ${realBrand} ${realModel}</h2>
          <p class="text-sm text-zinc-500 mb-5">Modèles d'autres marques dans la même gamme de prix (${avg ? formatPrice(avg) : ''} ±30%).</p>
          <div class="flex flex-wrap gap-2">
            ${comparableModels.map(m => `
            <a href="/prix-marche/${m.slug}"
               class="flex items-center gap-2 border border-zinc-200 hover:border-zinc-900 rounded-lg px-4 py-2 text-sm font-medium transition group">
              <span class="text-zinc-900 group-hover:text-zinc-700">${m.brand} ${m.model}</span>
              ${m.avg ? `<span class="text-xs text-zinc-400 group-hover:text-zinc-500">${formatPrice(m.avg)}</span>` : ''}
            </a>`).join('')}
          </div>
        </section>` : ''}

        <!-- CTA -->
        <section class="bg-zinc-950 rounded-2xl p-8 md:p-12 text-center">
          <h2 class="text-2xl font-bold text-white mb-3">Trouver la meilleure ${realBrand} ${realModel}</h2>
          <p class="text-zinc-400 text-sm mb-8 max-w-md mx-auto">
            Accédez au prix de marché exact, aux scores de bonne affaire et aux alertes de baisse de prix.
            Compte gratuit, aucune carte bancaire requise.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/#/search?brand=${encodeURIComponent(realBrand)}&model=${encodeURIComponent(realModel)}"
               class="bg-white text-zinc-900 font-semibold px-6 py-3 rounded-lg text-sm hover:bg-zinc-100 transition">
              Voir toutes les annonces →
            </a>
            <a href="/pricing"
               class="border border-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg text-sm hover:border-zinc-400 hover:text-white transition">
              Voir les tarifs
            </a>
          </div>
        </section>

      </main>

      ${footerHtml([[`Tous les ${realBrand}`, `/prix-marche/${brandSlug}`]])}
      `
    ));
  } catch (err) {
    logger.error('seoController getBrandModelPage error', { error: err.message });
    res.status(500).send('<h1>Erreur serveur</h1>');
  }
}

// ─── GET /prix-marche/:brand ───────────────────────────────────────────────────

export async function getBrandPage(req, res) {
  const { brand: brandSlug } = req.params;
  const brandSearch = brandSlug.replace(/-/g, ' ');

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('brand, model, price, location_country, currency')
      .eq('status', 'active')
      .ilike('brand', `%${brandSearch}%`)
      .limit(5000);

    if (error) {
      logger.error('seoController getBrandPage error', { error: error.message, brandSearch });
      return res.status(404).send(render404(brandSearch, ''));
    }
    if (!data?.length) {
      return res.status(404).send(render404(brandSearch, ''));
    }

    const realBrand = data[0].brand;

    // Model counts + avg prices
    const modelMap = {};
    data.forEach(l => {
      if (!l.model) return;
      if (!modelMap[l.model]) modelMap[l.model] = { count: 0, prices: [] };
      modelMap[l.model].count++;
      const p = toEUR(l.price, l.location_country, l.currency);
      if (p > 500) modelMap[l.model].prices.push(p);
    });

    const models = Object.entries(modelMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 24)
      .map(([model, { count, prices }]) => ({
        model,
        slug: slugify(model),
        count,
        avg: prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : null,
      }));

    const canonicalUrl = `${SITE_URL}/prix-marche/${brandSlug}`;
    const description = `Prix d'occasion ${realBrand} en Europe — ${models.length} modèles disponibles, ${formatNum(data.length)} annonces actives. Comparez les prix, trouvez les meilleures offres.`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(htmlShell(
      { title: `${realBrand} d'occasion — Prix du marché | Carindex`, description, canonical: canonicalUrl },
      `
      ${navHtml([['Prix du marché', '/prix-marche'], [realBrand, null]])}

      <main class="max-w-6xl mx-auto px-6 pt-8 pb-16">
        <div class="mb-10">
          <h1 class="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">
            ${realBrand} d'occasion — Prix du marché par modèle
          </h1>
          <p class="text-zinc-500 text-base max-w-2xl">${description}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-14">
          ${models.map(m => `
          <a href="/prix-marche/${brandSlug}/${m.slug}"
             class="group border border-zinc-200 hover:border-zinc-900 rounded-xl p-5 transition-all hover:shadow-md bg-white">
            <h2 class="font-semibold text-zinc-900 mb-1 group-hover:text-zinc-700">${realBrand} ${m.model}</h2>
            ${m.avg ? `<p class="text-lg font-bold text-zinc-900 mb-1">${formatPrice(m.avg)}</p>` : ''}
            <p class="text-xs text-zinc-400">${formatNum(m.count)} annonces</p>
          </a>`).join('')}
        </div>

        <section class="bg-zinc-950 rounded-2xl p-8 text-center">
          <h2 class="text-xl font-bold text-white mb-3">Rechercher une ${realBrand}</h2>
          <p class="text-zinc-400 text-sm mb-6">Prix de marché exact, score de bonne affaire, alertes de prix — gratuit.</p>
          <a href="/#/search?brand=${encodeURIComponent(realBrand)}"
             class="inline-block bg-white text-zinc-900 font-semibold px-6 py-3 rounded-lg text-sm hover:bg-zinc-100 transition">
            Rechercher ${realBrand} →
          </a>
        </section>
      </main>

      ${footerHtml()}
      `
    ));
  } catch (err) {
    logger.error('seoController getBrandPage error', { error: err.message });
    res.status(500).send('<h1>Erreur serveur</h1>');
  }
}

// ─── GET /prix-marche ─────────────────────────────────────────────────────────

export async function getMarketPriceHub(req, res) {
  try {
    const { data } = await supabase
      .from('listings')
      .select('brand')
      .eq('status', 'active')
      .limit(10000);

    const brandCounts = {};
    data?.forEach(l => { if (l.brand) brandCounts[l.brand] = (brandCounts[l.brand] || 0) + 1; });

    const brands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 48)
      .map(([brand, count]) => ({ brand, count, slug: slugify(brand) }));

    const canonicalUrl = `${SITE_URL}/prix-marche`;
    const description = "Prix du marché des voitures d'occasion en Europe. Comparez BMW, Audi, Volkswagen, Peugeot et 100+ marques sur 13 pays.";

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(htmlShell(
      { title: "Prix marché voiture d'occasion en Europe | Carindex", description, canonical: canonicalUrl },
      `
      ${navHtml([['Prix du marché', null]])}

      <main class="max-w-6xl mx-auto px-6 pt-8 pb-16">
        <div class="mb-10">
          <h1 class="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">
            Prix du marché — voitures d'occasion en Europe
          </h1>
          <p class="text-zinc-500 text-base max-w-2xl">${description}</p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-14">
          ${brands.map(b => `
          <a href="/prix-marche/${b.slug}"
             class="group border border-zinc-200 hover:border-zinc-900 rounded-xl p-4 text-center transition-all hover:shadow-md bg-white">
            <p class="font-semibold text-zinc-900 text-sm mb-0.5 group-hover:text-zinc-700">${b.brand}</p>
            <p class="text-xs text-zinc-400">${formatNum(b.count)} annonces</p>
          </a>`).join('')}
        </div>
      </main>

      ${footerHtml()}
      `
    ));
  } catch (err) {
    res.status(500).send('<h1>Erreur serveur</h1>');
  }
}

// ─── GET /sitemap.xml ─────────────────────────────────────────────────────────

export async function getSitemap(req, res) {
  try {
    const { data } = await supabase
      .from('listings')
      .select('brand, model')
      .eq('status', 'active')
      .limit(20000);

    // Pair counts
    const pairs = {};
    data?.forEach(l => {
      if (l.brand && l.model) {
        const key = `${l.brand}|||${l.model}`;
        pairs[key] = (pairs[key] || 0) + 1;
      }
    });

    // Only pairs with ≥ 5 listings
    const modelUrls = Object.entries(pairs)
      .filter(([, count]) => count >= 5)
      .map(([key]) => {
        const [brand, model] = key.split('|||');
        return `  <url>\n    <loc>${SITE_URL}/prix-marche/${slugify(brand)}/${slugify(model)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
      });

    // Brand pages
    const brandSet = new Set(data?.map(l => l.brand).filter(Boolean));
    const brandUrls = [...brandSet].map(brand =>
      `  <url>\n    <loc>${SITE_URL}/prix-marche/${slugify(brand)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`
    );

    const staticUrls = [
      `  <url>\n    <loc>${SITE_URL}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
      `  <url>\n    <loc>${SITE_URL}/pricing</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`,
      `  <url>\n    <loc>${SITE_URL}/prix-marche</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`,
    ];

    // Fetch published blog posts for sitemap
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('slug, published_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    const blogListingUrl = `  <url>\n    <loc>${SITE_URL}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    const blogPostUrls = (blogPosts || []).map(p => {
      const lastmod = (p.updated_at || p.published_at)?.split('T')[0];
      return `  <url>\n    <loc>${SITE_URL}/blog/${p.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, blogListingUrl, ...blogPostUrls, ...brandUrls, ...modelUrls].join('\n')}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
  } catch (err) {
    logger.error('seoController getSitemap error', { error: err.message });
    res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
  }
}

// ─── 404 page ─────────────────────────────────────────────────────────────────

function render404(brand, model) {
  return htmlShell(
    { title: 'Page introuvable | Carindex', description: '', canonical: `${SITE_URL}/prix-marche` },
    `
    ${navHtml()}
    <main class="max-w-2xl mx-auto px-6 py-24 text-center">
      <h1 class="text-2xl font-bold text-zinc-900 mb-3">Aucune annonce trouvée</h1>
      <p class="text-zinc-500 mb-8">Aucune annonce active pour "${brand}${model ? ' ' + model : ''}" sur nos marchés.</p>
      <a href="/prix-marche" class="bg-zinc-900 text-white font-semibold px-6 py-3 rounded-lg text-sm hover:bg-zinc-700 transition">
        Explorer tous les prix du marché →
      </a>
    </main>
    ${footerHtml()}
    `
  );
}
