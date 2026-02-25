#!/usr/bin/env node
/**
 * Run Supabase Bytbil import once (manual execution)
 * Usage: node src/scripts/run-supabase-bytbil-import.js
 */
import 'dotenv/config';
import { runSupabaseBytbilImportOnce } from '../jobs/supabaseBytbilImportJob.js';

runSupabaseBytbilImportOnce()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
