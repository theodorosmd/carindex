/**
 * Script pour tester différentes URLs de connexion Supabase
 * et identifier la bonne configuration
 */

import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const projectRef = 'jgrebihiurfmuhfftsoa';
const password = '57qxIZYf8xA81Qqorqq8vgC7+2b3s6HkyQGp90V/QjnD2wPkSeHT8U7dMaQYbCa9v1xc9sx7eCnA8FlNdQB6Hg==';
const encodedPassword = encodeURIComponent(password);

// Différentes URLs à tester
const urlsToTest = [
  {
    name: 'Direct connection (db.*.supabase.co)',
    url: `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`
  },
  {
    name: 'Connection pooling (pooler.supabase.com)',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
  },
  {
    name: 'Connection pooling (us-east-1)',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
  },
  {
    name: 'Connection pooling (eu-west-1)',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
  },
  {
    name: 'Current DATABASE_URL from .env',
    url: process.env.DATABASE_URL
  }
];

async function testConnection(name, url) {
  console.log(`\n🔍 Test: ${name}`);
  console.log(`   URL: ${url.replace(/:[^:@]+@/, ':****@')}`); // Masquer le mot de passe
  
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query('SELECT NOW() as time, version() as version, current_database() as database');
    console.log(`   ✅ SUCCÈS!`);
    console.log(`   Database: ${result.rows[0].database}`);
    console.log(`   Time: ${result.rows[0].time}`);
    await pool.end();
    return { success: true, url };
  } catch (error) {
    console.log(`   ❌ ÉCHEC: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    await pool.end();
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 Test des connexions Supabase\n');
  console.log('='.repeat(60));

  const results = [];
  
  for (const { name, url } of urlsToTest) {
    if (!url) continue;
    const result = await testConnection(name, url);
    results.push({ name, ...result });
    
    // Si on trouve une connexion qui fonctionne, on s'arrête
    if (result.success) {
      console.log(`\n✅ URL fonctionnelle trouvée: ${name}`);
      console.log(`\n📝 Mettez à jour votre .env avec:`);
      console.log(`DATABASE_URL=${url}`);
      break;
    }
  }

  // Résumé
  console.log('\n' + '='.repeat(60));
  const successful = results.find(r => r.success);
  
  if (successful) {
    console.log('\n✅ Connexion Supabase configurée avec succès!');
  } else {
    console.log('\n❌ Aucune connexion n\'a fonctionné.');
    console.log('\n💡 Solutions possibles:');
    console.log('1. Vérifiez que votre projet Supabase est actif (non en pause)');
    console.log('2. Allez sur: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database');
    console.log('3. Copiez l\'URL de connexion depuis la section "Connection string" → onglet "URI"');
    console.log('4. Mettez à jour DATABASE_URL dans backend/.env');
  }
}

main().catch(console.error);







