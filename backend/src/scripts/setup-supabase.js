import { db } from '../config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Setup script for Supabase
 * Creates the initial schema and runs migrations
 */
async function setupSupabase() {
  try {
    logger.info('Setting up Supabase database...');
    
    // Test connection
    logger.info('Testing database connection...');
    const testResult = await db.query('SELECT NOW() as current_time, version() as pg_version');
    logger.info('✅ Database connection successful!', {
      time: testResult.rows[0].current_time,
      version: testResult.rows[0].pg_version.split(' ')[0] + ' ' + testResult.rows[0].pg_version.split(' ')[1]
    });
    
    // Read and execute main schema
    logger.info('Creating main schema...');
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf8');
    await db.query(schemaSQL);
    logger.info('✅ Main schema created successfully');
    
    // Run migrations
    logger.info('Running migrations...');
    const migrationPath = join(__dirname, '..', 'database', 'migrations', '001_add_listing_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    await db.query(migrationSQL);
    logger.info('✅ Migrations completed successfully');
    
    // Verify tables
    logger.info('Verifying tables...');
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    logger.info('✅ Database setup complete!');
    logger.info('Created tables:', {
      tables: tablesResult.rows.map(r => r.table_name)
    });
    
    console.log('\n🎉 Supabase setup completed successfully!');
    console.log('\nTables created:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('Setup failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Cannot connect to database.');
      console.error('Please check your DATABASE_URL in .env file.');
      console.error('\nFor Supabase:');
      console.error('1. Go to your Supabase project');
      console.error('2. Settings → Database');
      console.error('3. Copy the Connection string (URI)');
      console.error('4. Update DATABASE_URL in backend/.env');
    } else if (error.code === '42P07') {
      console.error('\n⚠️  Some tables already exist. This is normal if you run the script multiple times.');
      console.error('The script will continue with migrations...');
    } else {
      console.error('\n❌ Error:', error.message);
      if (error.position) {
        console.error('SQL Error at position:', error.position);
      }
    }
    
    process.exit(1);
  }
}

setupSupabase();








