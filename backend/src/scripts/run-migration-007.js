import { supabase } from '../config/supabase.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    logger.info('Running migration 007: Add Auction Margin Calculator tables');
    
    const migrationPath = join(__dirname, '..', 'database', 'migrations', '007_add_auction_margin_tables.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.length > 0) {
        logger.info(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // If RPC doesn't exist, try direct query (Supabase allows this with service role)
          // For Supabase, we need to use the REST API or direct connection
          logger.warn('RPC method not available, trying alternative method...');
          
          // Use Supabase's REST API to execute raw SQL
          // Note: This requires the SQL Editor or a custom function
          // For now, let's try using the PostgREST approach
          throw new Error('Direct SQL execution not available via Supabase client. Please run the migration manually in Supabase SQL Editor.');
        }
      }
    }
    
    logger.info('Migration 007 completed successfully');
    console.log('\n✅ Migration 007 completed successfully!');
    console.log('\nIf you see errors above, please run the SQL manually in Supabase SQL Editor:');
    console.log(`File: ${migrationPath}`);
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease run the migration manually:');
    console.error('1. Go to your Supabase dashboard');
    console.error('2. Open SQL Editor');
    console.error('3. Copy and paste the contents of:');
    console.error(`   ${join(__dirname, '..', 'database', 'migrations', '007_add_auction_margin_tables.sql')}`);
    console.error('4. Execute the SQL');
    process.exit(1);
  }
}

runMigration();
