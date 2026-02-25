import { db } from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(migrationFile) {
  try {
    const migrationPath = join(__dirname, '..', 'database', 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');
    
    logger.info(`Running migration: ${migrationFile}`);
    await db.query(sql);
    logger.info(`Migration ${migrationFile} completed successfully`);
  } catch (error) {
    logger.error(`Error running migration ${migrationFile}:`, error);
    throw error;
  }
}

async function main() {
  const migrationFile = process.argv[2] || '001_add_listing_fields.sql';
  
  try {
    // Test connection first
    await db.query('SELECT 1');
    logger.info('Database connection OK');
    
    await runMigration(migrationFile);
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Cannot connect to database.');
      console.error('\nFor Supabase:');
      console.error('1. Check your DATABASE_URL in backend/.env');
      console.error('2. Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres');
      console.error('3. Or use: node src/scripts/setup-supabase.js for full setup');
    } else {
      console.error('\n❌ Error:', error.message);
    }
    
    process.exit(1);
  }
}

main();

