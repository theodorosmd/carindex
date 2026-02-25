#!/usr/bin/env node

/**
 * Script to check if migration 007 tables exist
 */

import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';

dotenv.config();

console.log('\n🔍 Vérification des tables de la migration 007...\n');
console.log('='.repeat(70));

const tables = ['auction_listings', 'comparable_listings', 'margin_calculations'];

let allExist = true;
let missingTables = [];

for (const table of tables) {
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      // Check if it's a "table doesn't exist" error
      if (error.message && (
        error.message.includes('does not exist') ||
        error.message.includes('Could not find the table') ||
        error.code === 'PGRST116' ||
        error.code === '42P01'
      )) {
        console.log(`❌ La table ${table} n'existe PAS`);
        allExist = false;
        missingTables.push(table);
      } else {
        // Table exists but there's another error (like no rows, which is fine)
        console.log(`✅ La table ${table} existe`);
      }
    } else {
      console.log(`✅ La table ${table} existe`);
    }
  } catch (error) {
    // If we get an exception, the table probably doesn't exist
    if (error.message && (
      error.message.includes('does not exist') ||
      error.message.includes('Could not find the table') ||
      error.code === 'PGRST116' ||
      error.code === '42P01'
    )) {
      console.log(`❌ La table ${table} n'existe PAS`);
      allExist = false;
      missingTables.push(table);
    } else {
      console.log(`⚠️  Erreur lors de la vérification de ${table}:`, error.message);
    }
  }
}

console.log('\n' + '='.repeat(70));

if (allExist) {
  console.log('\n🎉 Toutes les tables existent! La migration a été exécutée avec succès.\n');
  console.log('Si vous voyez toujours une erreur, essayez de:');
  console.log('1. Redémarrer le serveur backend');
  console.log('2. Vider le cache du navigateur');
  console.log('3. Recharger la page\n');
} else {
  console.log('\n❌ Certaines tables manquent. La migration n\'a pas été exécutée.\n');
  console.log('Tables manquantes:');
  missingTables.forEach(table => console.log(`  - ${table}`));
  console.log('\n📋 Pour créer les tables, exécutez:');
  console.log('   cd backend && node src/scripts/run-migration-007-supabase.js\n');
  console.log('Ou suivez les instructions dans backend/QUICK_FIX_MIGRATION.md\n');
}

process.exit(allExist ? 0 : 1);
