#!/usr/bin/env node

/**
 * Script to run migration 007: Add Auction Margin Calculator tables
 * 
 * This script will:
 * 1. Try to execute the migration via psql if DATABASE_URL is available
 * 2. Otherwise, display clear instructions to run it manually in Supabase
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationPath = join(__dirname, '..', 'database', 'migrations', '007_add_auction_margin_tables.sql');
const sql = readFileSync(migrationPath, 'utf8');

console.log('\n🔧 Migration 007: Add Auction Margin Calculator Tables\n');
console.log('=' .repeat(60));

// Try to execute via psql if DATABASE_URL is available
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl && databaseUrl.includes('postgresql://')) {
  console.log('\n✅ DATABASE_URL trouvé. Tentative d\'exécution automatique...\n');
  
  try {
    // Write SQL to temp file
    const tempFile = '/tmp/migration_007.sql';
    writeFileSync(tempFile, sql);
    
    // Execute via psql
    execSync(`psql "${databaseUrl}" -f ${tempFile}`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    console.log('\n✅ Migration 007 exécutée avec succès!\n');
    console.log('Les tables suivantes ont été créées:');
    console.log('  - auction_listings');
    console.log('  - comparable_listings');
    console.log('  - margin_calculations\n');
    
    // Clean up
    try {
      unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'exécution automatique:', error.message);
    console.log('\nPassons aux instructions manuelles...\n');
  }
}

// Manual instructions
console.log('\n📋 INSTRUCTIONS MANUELLES\n');
console.log('Pour exécuter cette migration, vous avez 2 options:\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('OPTION 1: Via Supabase Dashboard (Recommandé)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('1. Ouvrez https://app.supabase.com');
console.log('2. Sélectionnez votre projet');
console.log('3. Allez dans "SQL Editor" (menu de gauche)');
console.log('4. Cliquez sur "New query"');
console.log('5. Copiez-collez le SQL ci-dessous');
console.log('6. Cliquez sur "Run" (ou Cmd+Enter / Ctrl+Enter)\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('OPTION 2: Via psql (si vous avez accès direct)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('Si vous avez DATABASE_URL dans votre .env:');
console.log(`  psql "$DATABASE_URL" -f ${migrationPath}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('SQL À COPIER-COLLER:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(sql);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Après avoir exécuté la migration:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('1. Rechargez la page du calculateur de marge');
console.log('2. Réessayez de calculer une marge\n');

process.exit(0);
