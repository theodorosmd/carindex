/**
 * Test script for Supabase API connection
 */

import { testSupabaseConnection } from '../config/supabase.js';

async function main() {
  console.log('🧪 Test de la connexion Supabase API...\n');

  try {
    const result = await testSupabaseConnection();
    console.log('✅', result.message);
    console.log('\n🎉 La connexion Supabase API fonctionne!');
    console.log('\n📝 Vous pouvez maintenant utiliser l\'API au lieu de PostgreSQL direct.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('\n💡 Vérifiez que:');
    console.error('   1. SUPABASE_URL est configuré dans .env');
    console.error('   2. SUPABASE_SERVICE_ROLE_KEY est configuré dans .env');
    console.error('   3. La table "listings" existe dans Supabase');
    process.exit(1);
  }
}

main();







