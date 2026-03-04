/**
 * Vérifier l'état de la queue mobile_de_fetch_queue
 * Usage: node -r dotenv/config src/scripts/check-mobilede-queue.js
 */
import { supabase } from '../config/supabase.js';

async function main() {
  const { data: rows, error } = await supabase
    .from('mobile_de_fetch_queue')
    .select('status');

  if (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }

  const byStatus = {};
  (rows || []).forEach((row) => {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  });

  console.log('Queue mobile_de_fetch_queue:');
  console.log(JSON.stringify(byStatus, null, 2));

  const processing = byStatus?.processing || 0;
  const pending = byStatus?.pending || 0;
  const retry = byStatus?.retry || 0;
  if (processing > 0 && pending === 0 && retry === 0) {
    console.log('\n⚠️  Tous les items sont en "processing" (peut-être bloqués par d\'anciens workers).');
    console.log('   Pour réinitialiser: UPDATE mobile_de_fetch_queue SET status = \'retry\', locked_until = NULL WHERE status = \'processing\';');
  }
}

main().catch(console.error);
