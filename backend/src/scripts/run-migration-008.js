#!/usr/bin/env node

/**
 * Script to run migration 008: Add User Management and Naming for Evaluations
 * Since Supabase doesn't allow direct SQL execution via REST API,
 * this script will check the current state and provide instructions
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationPath = join(__dirname, '..', 'database', 'migrations', '008_add_evaluations_management.sql');
const sql = readFileSync(migrationPath, 'utf8');

console.log('\n🔧 Migration 008: Add User Management and Naming for Evaluations\n');
console.log('='.repeat(70));

// Try to check if columns already exist
console.log('\n📊 Vérification de l\'état actuel...\n');

try {
  // Try to query margin_calculations with user_id to see if column exists
  const { error } = await supabase
    .from('margin_calculations')
    .select('user_id')
    .limit(1);
  
  if (!error) {
    console.log('✅ La colonne user_id existe déjà!');
    console.log('La migration 008 semble déjà avoir été exécutée.\n');
    
    // Check all columns
    const columns = ['user_id', 'name', 'notes', 'updated_at'];
    let allExist = true;
    
    for (const column of columns) {
      try {
        const { error: colError } = await supabase
          .from('margin_calculations')
          .select(column)
          .limit(1);
        if (colError) {
          console.log(`❌ La colonne ${column} n'existe pas`);
          allExist = false;
        } else {
          console.log(`✅ La colonne ${column} existe`);
        }
      } catch (e) {
        console.log(`⚠️  Impossible de vérifier la colonne ${column}`);
        allExist = false;
      }
    }
    
    if (allExist) {
      console.log('\n✅ Toutes les colonnes existent. La migration 008 est complète!\n');
      process.exit(0);
    }
  } else {
    if (error.message && error.message.includes('user_id')) {
      console.log('❌ La colonne user_id n\'existe pas');
      console.log('La migration 008 doit être exécutée.\n');
    } else {
      console.log('⚠️  Erreur lors de la vérification:', error.message);
      console.log('Nous allons supposer que la migration doit être exécutée.\n');
    }
  }
} catch (e) {
  console.log('⚠️  Impossible de vérifier l\'état actuel:', e.message);
  console.log('Nous allons supposer que la migration doit être exécutée.\n');
}

console.log('='.repeat(70));
console.log('\n📋 Instructions pour exécuter la migration 008:\n');

// Get Supabase URL from env to construct the SQL editor URL
const supabaseUrl = process.env.SUPABASE_URL || '';
const projectRef = supabaseUrl ? supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] : null;

if (projectRef) {
  console.log(`1. Ouvrez le SQL Editor de Supabase:`);
  console.log(`   https://app.supabase.com/project/${projectRef}/sql/new\n`);
} else {
  console.log('1. Ouvrez le SQL Editor de Supabase:');
  console.log('   https://app.supabase.com\n');
}

console.log('2. Copiez et collez le SQL suivant dans l\'éditeur:\n');
console.log('-'.repeat(70));
console.log(sql);
console.log('-'.repeat(70));

console.log('\n3. Cliquez sur "Run" ou appuyez sur Ctrl+Enter\n');

console.log('4. Vérifiez que la migration a réussi:\n');
console.log('   - Les colonnes user_id, name, notes, updated_at doivent exister');
console.log('   - Les index doivent être créés\n');

console.log('5. Rechargez la page des évaluations dans votre navigateur\n');

console.log('='.repeat(70));
console.log('\n💡 Alternative: Exécutez directement dans psql si vous avez accès:\n');
console.log(`   psql $DATABASE_URL -f ${migrationPath}\n`);
