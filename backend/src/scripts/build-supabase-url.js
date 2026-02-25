/**
 * Script pour construire et tester l'URL Supabase PostgreSQL
 * avec le mot de passe fourni
 */

import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import readline from 'readline';

dotenv.config();

const projectRef = 'jgrebihiurfmuhfftsoa';

// Créer l'interface readline pour demander le mot de passe
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testConnection(name, url) {
  console.log(`\n🔍 Test: ${name}`);
  console.log(`   URL: ${url.replace(/:[^:@]+@/, ':****@')}`);
  
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 10000,
  });

  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as database');
    console.log(`   ✅ SUCCÈS!`);
    console.log(`   Database: ${result.rows[0].database}`);
    console.log(`   Time: ${result.rows[0].time}`);
    await pool.end();
    return { success: true, url };
  } catch (error) {
    console.log(`   ❌ ÉCHEC: ${error.message}`);
    if (error.code) {
      console.log(`   Code: ${error.code}`);
    }
    await pool.end();
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔧 Construction de l\'URL PostgreSQL Supabase\n');
  console.log('='.repeat(70));

  // Demander le mot de passe
  console.log('\n📝 Entrez le mot de passe de votre base de données Supabase');
  console.log('   (Vous pouvez le réinitialiser depuis le dashboard si nécessaire)');
  const password = await question('\nMot de passe: ');

  if (!password) {
    console.log('\n❌ Mot de passe requis');
    rl.close();
    process.exit(1);
  }

  // Encoder le mot de passe
  const encodedPassword = encodeURIComponent(password);

  console.log('\n🧪 Test des différentes variantes d\'URL...\n');

  // Tester différentes variantes
  const urlsToTest = [
    // Connection Pooling (recommandé)
    {
      name: 'Connection Pooling - eu-central-1 (port 6543)',
      url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
    },
    {
      name: 'Connection Pooling - eu-west-1 (port 6543)',
      url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
    },
    {
      name: 'Connection Pooling - us-east-1 (port 6543)',
      url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    },
    // Direct connection
    {
      name: 'Direct Connection - db.*.supabase.co (port 5432)',
      url: `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`
    },
    // Pooling avec pgbouncer
    {
      name: 'Pooling Transaction Mode - eu-central-1',
      url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
    }
  ];

  for (const { name, url } of urlsToTest) {
    const result = await testConnection(name, url);
    if (result.success) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`✅ URL FONCTIONNELLE TROUVÉE: ${name}`);
      console.log(`\n📝 Ajoutez cette ligne dans backend/.env :\n`);
      console.log(`DATABASE_URL=${url}\n`);
      console.log('='.repeat(70));
      rl.close();
      process.exit(0);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('❌ Aucune URL n\'a fonctionné avec ce mot de passe.\n');
  console.log('💡 Vérifications possibles:\n');
  console.log('1. Le mot de passe est-il correct ?');
  console.log('2. Le projet est-il actif (non en pause) ?');
  console.log('3. Y a-t-il des restrictions réseau activées ?');
  console.log('4. Essayez de réinitialiser le mot de passe depuis le dashboard\n');

  rl.close();
}

main().catch(error => {
  console.error('Erreur:', error);
  rl.close();
  process.exit(1);
});







