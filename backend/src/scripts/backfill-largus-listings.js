/**
 * Backfill script: re-fetch detail pages for existing Largus listings
 * to fill missing columns (images, color, doors, transmission, description, etc.)
 *
 * Run: node src/scripts/backfill-largus-listings.js
 * Options: BACKFILL_LIMIT=50 (default) BACKFILL_MISSING_ONLY=1 (only listings with null images)
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { runLargusBackfill } from '../services/largusService.js';

const LIMIT = parseInt(process.env.BACKFILL_LIMIT || '50', 10);

async function main() {
  logger.info('Starting Largus backfill', { limit: LIMIT });

  const result = await runLargusBackfill({ limit: LIMIT });

  logger.info('Largus backfill completed', result);
  console.log('\n✅ Backfill terminé:', result);
}

main().catch((e) => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
