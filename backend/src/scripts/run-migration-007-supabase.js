#!/usr/bin/env node

/**
 * Script to run migration 007 using Supabase API
 * Since Supabase doesn't allow direct SQL execution via REST API,
 * this script will prepare the SQL and provide instructions
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationPath = join(__dirname, '..', 'database', 'migrations', '007_add_auction_margin_tables.sql');
const sql = readFileSync(migrationPath, 'utf8');

console.log('\n🔧 Migration 007: Add Auction Margin Calculator Tables\n');
console.log('='.repeat(70));

// Try to check if tables already exist
console.log('\n📊 Vérification de l\'état actuel...\n');

try {
  // Try to query auction_listings to see if it exists
  const { error } = await supabase.from('auction_listings').select('id').limit(1);
  
  if (!error) {
    console.log('✅ La table auction_listings existe déjà!');
    console.log('Les tables semblent déjà créées. Vérifions...\n');
    
    // Check all three tables
    const tables = ['auction_listings', 'comparable_listings', 'margin_calculations'];
    let allExist = true;
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('id').limit(1);
        if (tableError) {
          console.log(`❌ La table ${table} n'existe pas`);
          allExist = false;
        } else {
          console.log(`✅ La table ${table} existe`);
        }
      } catch (e) {
        console.log(`❌ La table ${table} n'existe pas`);
        allExist = false;
      }
    }
    
    if (allExist) {
      console.log('\n🎉 Toutes les tables existent déjà! La migration n\'est pas nécessaire.\n');
      process.exit(0);
    }
  }
} catch (error) {
  // Table doesn't exist, which is expected
  console.log('ℹ️  Les tables n\'existent pas encore. Procédons à la migration...\n');
}

// Since Supabase REST API doesn't support raw SQL execution,
// we need to use the SQL Editor in the dashboard
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 INSTRUCTIONS POUR EXÉCUTER LA MIGRATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl ? supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] : null;

if (projectRef) {
  console.log(`🔗 Lien direct vers votre SQL Editor:`);
  console.log(`   https://app.supabase.com/project/${projectRef}/sql/new\n`);
}

console.log('Étapes:');
console.log('1. Ouvrez le lien ci-dessus (ou allez sur https://app.supabase.com)');
console.log('2. Sélectionnez votre projet');
console.log('3. Allez dans "SQL Editor" (menu de gauche)');
console.log('4. Cliquez sur "New query"');
console.log('5. Copiez-collez le SQL ci-dessous');
console.log('6. Cliquez sur "Run" (ou Cmd+Enter / Ctrl+Enter)\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 SQL À COPIER-COLLER:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(sql);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Après avoir exécuté la migration:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('1. Vous devriez voir un message de succès');
console.log('2. Rechargez la page du calculateur de marge dans votre navigateur');
console.log('3. Réessayez de calculer une marge\n');

// Try to open browser (optional)
try {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  if (projectRef) {
    const url = `https://app.supabase.com/project/${projectRef}/sql/new`;
    console.log(`🌐 Tentative d'ouverture du navigateur...\n`);
    
    try {
      await execAsync(`open "${url}"`);
      console.log('✅ Navigateur ouvert! Vous pouvez maintenant coller le SQL ci-dessus.\n');
    } catch (e) {
      // Ignore if browser can't be opened
    }
  }
} catch (e) {
  // Ignore if exec is not available
}

process.exit(0);
