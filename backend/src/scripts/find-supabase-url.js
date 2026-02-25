/**
 * Script pour trouver l'URL PostgreSQL Supabase correcte
 * en testant différentes variantes et en vérifiant l'état du projet
 */

import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const projectRef = 'jgrebihiurfmuhfftsoa';
const password = '57qxIZYf8xA81Qqorqq8vgC7+2b3s6HkyQGp90V/QjnD2wPkSeHT8U7dMaQYbCa9v1xc9sx7eCnA8FlNdQB6Hg==';
const encodedPassword = encodeURIComponent(password);

// Vérifier l'état du projet via l'API Supabase
async function checkProjectStatus() {
  const supabaseUrl = process.env.SUPABASE_URL || `https://${projectRef}.supabase.co`;
  console.log(`\n🔍 Vérification de l'état du projet Supabase...`);
  console.log(`   URL: ${supabaseUrl}\n`);

  try {
    // Test simple : essayer de se connecter à l'API
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`
      }
    });

    if (response.ok || response.status === 404) {
      // 404 est normal pour la racine de l'API
      console.log('✅ Projet Supabase est actif (API accessible)');
      return true;
    } else {
      console.log(`⚠️  Statut API: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Impossible de vérifier l'API: ${error.message}`);
    return false;
  }
}

// Tester différentes variantes d'URLs PostgreSQL
async function testConnection(name, url) {
  console.log(`\n🔍 Test: ${name}`);
  console.log(`   URL: ${url.replace(/:[^:@]+@/, ':****@')}`); // Masquer le mot de passe
  
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 10000, // Augmenter le timeout
  });

  try {
    const result = await pool.query('SELECT NOW() as time, version() as version, current_database() as database');
    console.log(`   ✅ SUCCÈS!`);
    console.log(`   Database: ${result.rows[0].database}`);
    console.log(`   Time: ${result.rows[0].time}`);
    console.log(`   PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    await pool.end();
    return { success: true, url };
  } catch (error) {
    console.log(`   ❌ ÉCHEC: ${error.message}`);
    if (error.code) {
      console.log(`   Code: ${error.code}`);
    }
    await pool.end();
    return { success: false, error: error.message, code: error.code };
  }
}

async function main() {
  console.log('🧪 Recherche de l\'URL PostgreSQL Supabase correcte\n');
  console.log('='.repeat(70));

  // 1. Vérifier l'état du projet
  const projectActive = await checkProjectStatus();

  if (!projectActive) {
    console.log('\n⚠️  Le projet Supabase semble être en pause ou inaccessible.');
    console.log('   Allez sur: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa');
    console.log('   Vérifiez si vous devez "Restore project" ou "Resume project"\n');
  }

  // 2. Tester différentes variantes d'URLs
  console.log('\n' + '='.repeat(70));
  console.log('🔌 Test des connexions PostgreSQL\n');

  const urlsToTest = [
    // Format direct avec différents ports
    {
      name: 'Direct (port 5432) - db.*.supabase.co',
      url: `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`
    },
    {
      name: 'Direct (port 5432) - aws-0-eu-central-1.pooler',
      url: `postgresql://postgres:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
    },
    // Format connection pooling
    {
      name: 'Connection Pooling (port 6543) - eu-central-1',
      url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
    },
    {
      name: 'Connection Pooling (port 6543) - eu-west-1',
      url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
    },
    {
      name: 'Connection Pooling (port 6543) - us-east-1',
      url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    },
    // Format avec transaction mode
    {
      name: 'Pooling Transaction Mode - eu-central-1',
      url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
    },
    // Format avec session mode
    {
      name: 'Pooling Session Mode - eu-central-1',
      url: `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?pgbouncer=true`
    },
    // URL actuelle du .env
    {
      name: 'URL actuelle du .env',
      url: process.env.DATABASE_URL
    }
  ].filter(item => item.url); // Filtrer les URLs vides

  const results = [];
  
  for (const { name, url } of urlsToTest) {
    const result = await testConnection(name, url);
    results.push({ name, ...result });
    
    // Si on trouve une connexion qui fonctionne, on s'arrête
    if (result.success) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`✅ URL FONCTIONNELLE TROUVÉE: ${name}`);
      console.log(`\n📝 Mettez à jour votre backend/.env avec:`);
      console.log(`\nDATABASE_URL=${url}\n`);
      console.log('='.repeat(70));
      return;
    }
  }

  // Résumé si aucune URL n'a fonctionné
  console.log('\n' + '='.repeat(70));
  console.log('❌ Aucune connexion PostgreSQL n\'a fonctionné.\n');
  
  console.log('💡 Solutions possibles:\n');
  console.log('1. Vérifiez que le projet Supabase est actif (non en pause)');
  console.log('   → https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa');
  console.log('\n2. Obtenez l\'URL exacte depuis le dashboard:');
  console.log('   → https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database');
  console.log('   → Section "Connection string" → onglet "URI"');
  console.log('\n3. Vérifiez que le mot de passe est correct');
  console.log('   → Le mot de passe doit être URL-encodé si il contient des caractères spéciaux');
  console.log('\n4. Essayez de réinitialiser le mot de passe de la base de données');
  console.log('   → Settings → Database → Reset database password');
  console.log('\n5. Vérifiez les logs Supabase pour des erreurs');
  console.log('   → https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/logs/explorer');
}

main().catch(console.error);







