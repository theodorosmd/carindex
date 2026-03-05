#!/usr/bin/env node
/**
 * Test minimal de connexion Supabase - debug si check:growth retourne 0.
 * Usage: node -r dotenv/config src/scripts/test-supabase-connection.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', url ? `${url.slice(0, 30)}...` : 'MANQUANT');
console.log('Service key:', key ? `${key.slice(0, 20)}...` : 'MANQUANT');
console.log('');

if (!url || !key) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  // 1. Count
  const { count, error: countErr } = await supabase.from('listings').select('*', { count: 'exact', head: true });
  console.log('1. Count listings:', count ?? 'null', countErr ? `| Erreur: ${countErr.message}` : '');

  // 2. Fetch 1 row
  const { data: row, error: rowErr } = await supabase.from('listings').select('id, source_platform').limit(1).maybeSingle();
  console.log('2. Premier row:', row ? JSON.stringify(row) : 'vide', rowErr ? `| Erreur: ${rowErr.message}` : '');

  // 3. Tables existantes ?
  const { data: tables, error: tablesErr } = await supabase.from('listings').select('id').limit(0);
  console.log('3. Table listings accessible:', !tablesErr, tablesErr ? `| Erreur: ${tablesErr.message}` : '');

  if (count > 0) {
    console.log('\n✅ Connexion OK. Total:', count.toLocaleString('fr-FR'));
  } else {
    console.log('\n⚠️ Count=0. Vérifier dans Supabase Dashboard → Table Editor → listings');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
