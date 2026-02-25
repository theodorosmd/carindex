import { supabase } from '../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script pour lister tous les scrapings automatiques configurés
 */
async function listAutoScrapers() {
  try {
    console.log('🔍 Recherche des scrapings automatiques...\n');

    const { data: scrapers, error } = await supabase
      .from('auto_scrapers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur lors de la récupération:', error.message);
      process.exit(1);
    }

    if (!scrapers || scrapers.length === 0) {
      console.log('📭 Aucun scraping automatique trouvé dans la base de données.\n');
      console.log('💡 Pour créer un scraping :');
      console.log('   1. Allez sur le Dashboard Admin (#/admin)');
      console.log('   2. Cliquez sur "+ Nouveau scraping automatique"');
      console.log('   3. Remplissez le formulaire et enregistrez\n');
      return;
    }

    console.log(`✅ ${scrapers.length} scraping(s) automatique(s) trouvé(s) :\n`);

    scrapers.forEach((scraper, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📋 Scraping #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID: ${scraper.id}`);
      console.log(`Nom: ${scraper.name}`);
      console.log(`Source: ${scraper.source}`);
      console.log(`URLs: ${scraper.search_urls.length} URL(s)`);
      if (scraper.search_urls.length > 0) {
        scraper.search_urls.slice(0, 3).forEach((url, i) => {
          console.log(`   ${i + 1}. ${url}`);
        });
        if (scraper.search_urls.length > 3) {
          console.log(`   ... et ${scraper.search_urls.length - 3} autre(s) URL(s)`);
        }
      }
      console.log(`Planning: ${scraper.schedule_cron}`);
      console.log(`Limite: ${scraper.max_results >= 999999 ? 'Sans limite (toutes les annonces)' : `${scraper.max_results} annonces max`}`);
      console.log(`Limite par thread: ${scraper.result_limit_per_thread || 100}`);
      console.log(`Statut: ${scraper.enabled ? '✅ Actif' : '⏸️ Inactif'}`);
      console.log(`Dernière exécution: ${scraper.last_run_at ? new Date(scraper.last_run_at).toLocaleString('fr-FR') : 'Jamais'}`);
      console.log(`Statut dernière exécution: ${scraper.last_run_status || 'N/A'}`);
      if (scraper.last_run_result) {
        const result = scraper.last_run_result;
        if (result.totalScraped) {
          console.log(`   📊 Scrapé: ${result.totalScraped} annonces`);
          console.log(`   💾 Sauvegardé: ${result.saved || 0} annonces`);
        }
        if (result.error) {
          console.log(`   ❌ Erreur: ${result.error}`);
        }
      }
      console.log(`Créé le: ${new Date(scraper.created_at).toLocaleString('fr-FR')}`);
      console.log('');
    });

    console.log('💡 Pour voir ces scrapings dans le Dashboard Admin :');
    console.log('   1. Allez sur http://localhost:3000/#/admin');
    console.log('   2. Descendez jusqu\'à la section "Scrapings automatiques"');
    console.log('   3. Si vous ne les voyez pas, vérifiez la console du navigateur (F12)\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

listAutoScrapers();







