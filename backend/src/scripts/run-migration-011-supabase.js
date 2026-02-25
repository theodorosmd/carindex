import { supabase } from '../config/supabase.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run migration 011 using Supabase client
 * This migration adds price history tracking fields
 */
async function runMigration011() {
  try {
    logger.info('Starting migration 011: Enhanced Price History...');

    // Read migration file
    const migrationPath = join(__dirname, '..', 'database', 'migrations', '011_price_history_enhanced.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    logger.info('Migration SQL loaded, executing...');

    // Split SQL into individual statements (Supabase doesn't support multi-statement queries directly)
    // We'll use the Supabase RPC or execute statements one by one
    // For now, we'll use the direct SQL execution via Supabase
    
    // Note: Supabase client doesn't support raw SQL execution directly
    // We need to use the REST API or execute via pg client
    // For simplicity, we'll provide instructions to run in SQL Editor
    
    console.log('\n⚠️  Supabase client cannot execute raw SQL directly.');
    console.log('Please run this migration in the Supabase SQL Editor:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/sql/new');
    console.log('2. Copy the content of: backend/src/database/migrations/011_price_history_enhanced.sql');
    console.log('3. Paste and execute in the SQL Editor\n');
    
    // Alternatively, we can try to execute via Supabase using the REST API
    // But the easiest way is via SQL Editor
    
    // Let's try to verify if migration was already run
    logger.info('Checking if migration was already applied...');
    
    const { data: listingsColumns, error: listingsError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'listings'
            AND column_name = 'first_seen'
        `
      });

    // Since Supabase doesn't have exec_sql by default, we'll check differently
    // Try to query a column that should exist after migration
    try {
      const { data: testData, error: testError } = await supabase
        .from('listings')
        .select('first_seen')
        .limit(1);

      if (testError && testError.message.includes('column') && testError.message.includes('first_seen')) {
        console.log('\n❌ Migration not applied yet. Column "first_seen" does not exist.');
        console.log('Please run the migration in Supabase SQL Editor as described above.\n');
        process.exit(1);
      } else {
        console.log('\n✅ Migration appears to be already applied (first_seen column exists)');
        console.log('If you see errors, please verify all columns exist.\n');
      }
    } catch (error) {
      console.log('\n⚠️  Could not verify migration status automatically.');
      console.log('Please run the migration manually in Supabase SQL Editor.\n');
      console.log('Migration file:', migrationPath);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error running migration 011:', error);
    console.error('\n❌ Error:', error.message);
    console.error('\nPlease run the migration manually in Supabase SQL Editor:');
    console.error('https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/sql/new\n');
    process.exit(1);
  }
}

// Run migration
runMigration011();
