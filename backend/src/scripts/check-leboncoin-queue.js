/**
 * Vérifier l'état de la queue leboncoin_fetch_queue
 * Usage: node -r dotenv/config src/scripts/check-leboncoin-queue.js
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { count: pending } = await supabase
    .from('leboncoin_fetch_queue')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'retry']);
  const { count: processing } = await supabase
    .from('leboncoin_fetch_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'processing');
  const { count: ok } = await supabase
    .from('leboncoin_fetch_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ok');

  console.log('Queue leboncoin_fetch_queue:');
  console.log('  pending:', pending ?? 0);
  console.log('  processing:', processing ?? 0);
  console.log('  ok:', ok ?? 0);
  console.log('');
  console.log('  Pour réinitialiser les items bloqués:');
  console.log("  UPDATE leboncoin_fetch_queue SET status = 'retry', locked_until = NULL WHERE status = 'processing';");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
