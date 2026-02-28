#!/usr/bin/env node
/**
 * Vérifie que le backfill listing_sources a bien peuplé la table.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { count: listingsCount, error: e1 } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  const { count: sourcesCount, error: e2 } = await supabase
    .from('listing_sources')
    .select('*', { count: 'exact', head: true });

  if (e1 || e2) {
    console.error('Error:', e1?.message || e2?.message);
    process.exit(1);
  }

  const multiSource = await supabase
    .from('listing_sources')
    .select('listing_id')
    .then(({ data }) => {
      const byListing = {};
      (data || []).forEach((r) => {
        byListing[r.listing_id] = (byListing[r.listing_id] || 0) + 1;
      });
      return Object.values(byListing).filter((c) => c > 1).length;
    });

  console.log('📊 listing_sources backfill:');
  console.log('   Listings:', listingsCount);
  console.log('   listing_sources rows:', sourcesCount);
  console.log('   Listings avec 2+ sources:', multiSource);
  if (listingsCount > 0 && sourcesCount >= listingsCount) {
    console.log('   ✅ Backfill OK (chaque listing a au moins une source)');
  } else if (listingsCount > 0 && sourcesCount === 0) {
    console.log('   ⚠️  Table vide - exécuter migrate:030:api');
  } else {
    console.log('   ⚠️  Vérifier la migration');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
