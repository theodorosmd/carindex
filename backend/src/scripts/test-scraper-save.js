/**
 * Script pour tester le scraper et vérifier la sauvegarde dans Supabase
 */

import dotenv from 'dotenv';
import { runAutoScout24Scraper } from '../services/autoscout24Service.js';
import { supabase } from '../config/supabase.js';

dotenv.config();

async function testScraper() {
  console.log('🚀 Test du scraper avec sauvegarde Supabase\n');
  console.log('='.repeat(70));

  // URL de test pour AutoScout24
  const testUrl = 'https://www.autoscout24.com/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&cy=D&atype=C&';

  console.log('📋 Configuration:');
  console.log(`   URL de recherche: ${testUrl}`);
  console.log(`   Max résultats: 10 (pour le test)\n`);

  try {
    // 1. Vérifier le nombre de listings avant
    console.log('📊 Vérification de l\'état initial...');
    const { count: countBefore } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    console.log(`   Listings dans la base avant: ${countBefore || 0}\n`);

    // 2. Lancer le scraper
    console.log('🎬 Lancement du scraper...');
    const result = await runAutoScout24Scraper([testUrl], {
      resultLimitPerThread: 10,
      maxResults: 10
    });

    console.log('✅ Scraper terminé!');
    console.log(`   Run ID: ${result.runId}`);
    console.log(`   Total scraped: ${result.totalScraped}`);
    console.log(`   Saved: ${result.saved}\n`);

    // 3. Vérifier le nombre de listings après
    console.log('📊 Vérification de l\'état final...');
    const { count: countAfter } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    console.log(`   Listings dans la base après: ${countAfter || 0}`);
    console.log(`   Nouveaux listings ajoutés: ${(countAfter || 0) - (countBefore || 0)}\n`);

    // 4. Récupérer quelques exemples de listings sauvegardés
    console.log('📄 Exemples de listings sauvegardés:');
    const { data: sampleListings, error: sampleError } = await supabase
      .from('listings')
      .select('id, brand, model, year, price, location_country, source_platform')
      .order('created_at', { ascending: false })
      .limit(5);

    if (sampleError) {
      console.error('   ❌ Erreur lors de la récupération:', sampleError.message);
    } else if (sampleListings && sampleListings.length > 0) {
      sampleListings.forEach((listing, index) => {
        console.log(`\n   ${index + 1}. ${listing.brand || 'N/A'} ${listing.model || 'N/A'} (${listing.year || 'N/A'})`);
        console.log(`      Prix: ${listing.price || 'N/A'} ${listing.location_country || ''}`);
        console.log(`      Source: ${listing.source_platform || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️  Aucun listing trouvé dans la base');
    }

    // 5. Résumé
    console.log('\n' + '='.repeat(70));
    if (result.saved > 0 && (countAfter || 0) > (countBefore || 0)) {
      console.log('✅ SUCCÈS! Les données ont été sauvegardées dans Supabase.');
      console.log(`\n📊 Résumé:`);
      console.log(`   - Listings scrapés: ${result.totalScraped}`);
      console.log(`   - Listings sauvegardés: ${result.saved}`);
      console.log(`   - Total dans la base: ${countAfter || 0}`);
    } else if (result.totalScraped === 0) {
      console.log('⚠️  Le scraper n\'a retourné aucun résultat.');
      console.log('   Vérifiez l\'URL de recherche ou les logs du scraper.');
    } else {
      console.log('⚠️  Les données n\'ont pas été sauvegardées.');
      console.log('   Vérifiez les logs pour plus de détails.');
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

testScraper();







