#!/usr/bin/env node
/**
 * Diagnostic : croissance des listings, créations vs skips, queues, raw_listings.
 * Usage: node -r dotenv/config src/scripts/check-listings-growth.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env');
  process.exit(1);
}
const supabase = createClient(url, key);

const SOURCES = ['autoscout24', 'mobile.de', 'leboncoin', 'largus', 'lacentrale', 'blocket', 'bilweb', 'bytbil', 'subito', 'gaspedaal', 'marktplaats', 'coches.net', 'finn', 'otomoto', '2ememain'];
const normalize = (s) => (['mobile_de', 'mobilede'].includes(s) ? 'mobile.de' : s);

async function countListings(filters = {}) {
  let q = supabase.from('listings').select('*', { count: 'exact', head: true });
  if (filters.sourcePlatform) q = q.eq('source_platform', filters.sourcePlatform);
  if (filters.sourcePlatformIn) q = q.in('source_platform', filters.sourcePlatformIn);
  if (filters.createdSince) q = q.gte('created_at', filters.createdSince);
  const { count, error } = await q;
  if (error && process.env.DEBUG_GROWTH) console.error('   [DEBUG] count:', error.message);
  return error ? 0 : (count ?? 0);
}

async function safeCount(table, query) {
  const { count, error } = await query.select('*', { count: 'exact', head: true });
  return error ? 0 : (count ?? 0);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '?';
  console.log('📊 Diagnostic croissance listings');
  console.log(`   Supabase: ${projectId}.supabase.co`);
  process.stdout.write('   Chargement (30-60s)...\n');

  // Test connexion + count (avec debug si erreur)
  const { count: totalCount, error: countErr } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error('❌ Erreur count listings:', countErr.message);
    console.error('   Code:', countErr.code, '| Details:', JSON.stringify(countErr.details || {}));
    process.exit(1);
  }
  const total = totalCount ?? 0;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const bySource = {};
  const created7dBySource = {};
  const created14dBySource = {};
  const sourcesToQuery = SOURCES.filter((s) => !['mobile_de', 'mobilede'].includes(s));

  for (const src of sourcesToQuery) {
    const c = await countListings({ sourcePlatform: src });
    if (c > 0) bySource[normalize(src)] = (bySource[normalize(src)] || 0) + c;
    const c7 = await countListings({ sourcePlatform: src, createdSince: weekAgo.toISOString() });
    const c14 = await countListings({ sourcePlatform: src, createdSince: twoWeeksAgo.toISOString() });
    if (c7 > 0 || c14 > 0) {
      const key = normalize(src);
      created7dBySource[key] = (created7dBySource[key] || 0) + c7;
      created14dBySource[key] = (created14dBySource[key] || 0) + c14;
    }
  }
  const md = await countListings({ sourcePlatformIn: ['mobile.de', 'mobile_de', 'mobilede'] });
  if (md > 0) bySource['mobile.de'] = md;
  const md7 = await countListings({ sourcePlatformIn: ['mobile.de', 'mobile_de', 'mobilede'], createdSince: weekAgo.toISOString() });
  const md14 = await countListings({ sourcePlatformIn: ['mobile.de', 'mobile_de', 'mobilede'], createdSince: twoWeeksAgo.toISOString() });
  if (md7 > 0 || md14 > 0) {
    created7dBySource['mobile.de'] = md7;
    created14dBySource['mobile.de'] = md14;
  }

  const totalCreated7d = await countListings({ createdSince: weekAgo.toISOString() });
  const totalCreated14d = await countListings({ createdSince: twoWeeksAgo.toISOString() });

  // 3. raw_listings en attente
  const rawPending = await safeCount('raw_listings', supabase.from('raw_listings').select('*').is('processed_at', null));
  const rawPendingBySource = {};
  if (rawPending > 0) {
    const { data } = await supabase.from('raw_listings').select('source_platform').is('processed_at', null);
    (data || []).forEach((r) => {
      const s = normalize(r.source_platform || 'unknown');
      rawPendingBySource[s] = (rawPendingBySource[s] || 0) + 1;
    });
  }

  // 4. Queues
  const leboncoinPending = await safeCount('leboncoin_fetch_queue', supabase.from('leboncoin_fetch_queue').select('*').in('status', ['pending', 'retry']));
  const leboncoinProcessing = await safeCount('leboncoin_fetch_queue', supabase.from('leboncoin_fetch_queue').select('*').eq('status', 'processing'));
  let mobiledePending = 0;
  let mobiledeProcessing = 0;
  try {
    mobiledePending = await safeCount('mobilede_fetch_queue', supabase.from('mobilede_fetch_queue').select('*').in('status', ['pending', 'retry']));
    mobiledeProcessing = await safeCount('mobilede_fetch_queue', supabase.from('mobilede_fetch_queue').select('*').eq('status', 'processing'));
  } catch (_) {}

  // 5. Site totals (objectif)
  const { data: siteTotals } = await supabase.from('source_site_totals').select('source_platform, total_available');
  const siteTotalsMap = {};
  (siteTotals || []).forEach((r) => { siteTotalsMap[r.source_platform] = r.total_available; });

  // --- Print ---
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 TOTAL LISTINGS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Total: ${(total ?? 0).toLocaleString('fr-FR')}`);
  console.log(`   Créés 7j:  ${totalCreated7d.toLocaleString('fr-FR')}`);
  console.log(`   Créés 14j: ${totalCreated14d.toLocaleString('fr-FR')}`);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 PAR SOURCE (total | créés 7j | créés 14j | % site)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const sorted = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  for (const [src, count] of sorted) {
    const c7 = created7dBySource[src] || 0;
    const c14 = created14dBySource[src] || 0;
    const siteTotal = siteTotalsMap[src];
    const pct = siteTotal > 0 ? ((count / siteTotal) * 100).toFixed(1) : '—';
    console.log(`   ${src.padEnd(14)} ${String(count).padStart(8)} | +${String(c7).padStart(6)} 7j | +${String(c14).padStart(6)} 14j | ${pct}%`);
  }
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 RAW_LISTINGS & QUEUES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   raw_listings en attente: ${rawPending.toLocaleString('fr-FR')}`);
  if (Object.keys(rawPendingBySource).length > 0) {
    Object.entries(rawPendingBySource).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => console.log(`      ${s}: ${c}`));
  }
  console.log(`   Leboncoin queue: pending=${leboncoinPending}, processing=${leboncoinProcessing}`);
  console.log(`   mobile.de queue: pending=${mobiledePending}, processing=${mobiledeProcessing}`);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 RECOMMANDATIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (total === 0) {
    console.log('   • Total = 0 : le .env local pointe peut-être vers une base vide.');
    console.log('   • Copie SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY depuis Railway → Variables');
    console.log('   • Voir backend/SETUP_LOCAL.md');
  } else if (totalCreated7d < 1000) {
    console.log('   • Créations faibles: vérifier INGEST_CREATE_ONLY=true, scrapers sur Railway');
    console.log('   • Lancer ENABLE_CONTINUOUS_SCRAPING=true pour boucle continue');
  }
  if (rawPending > 5000) {
    console.log('   • Backlog raw_listings: augmenter PROCESS_RAW_LISTINGS_BATCH_SIZE ou fréquence');
  }
  if (leboncoinPending > 10000) {
    console.log('   • Queue Leboncoin pleine: lancer plus de workers (PM2)');
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
