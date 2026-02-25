import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Script pour mettre à jour l'URL du scraper BMW vers une URL plus large
 * qui capture toutes les annonces BMW disponibles
 */
async function updateBmwScraperUrl() {
  console.log('🔧 Mise à jour de l\'URL du scraper BMW...\n');

  try {
    // Trouver le scraper BMW
    const { data: scrapers, error: fetchError } = await supabase
      .from('auto_scrapers')
      .select('id, name, search_urls')
      .ilike('name', '%BMW%')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
    }

    if (!scrapers || scrapers.length === 0) {
      console.log('❌ Aucun scraper BMW trouvé');
      return;
    }

    // Nouvelle URL simple sans filtres restrictifs
    const newUrl = 'https://www.autoscout24.fr/lst/bmw';

    for (const scraper of scrapers) {
      const oldUrl = scraper.search_urls[0];
      
      console.log(`📋 Scraper: ${scraper.name}`);
      console.log(`   Ancienne URL: ${oldUrl}`);
      console.log(`   Nouvelle URL: ${newUrl}`);
      
      // Vérifier si l'URL a déjà été mise à jour
      if (oldUrl === newUrl || oldUrl === 'https://www.autoscout24.fr/lst/bmw?sort=standard&desc=0') {
        console.log(`   ✅ URL déjà à jour, pas de modification nécessaire\n`);
        continue;
      }

      // Mettre à jour l'URL
      const { error: updateError } = await supabase
        .from('auto_scrapers')
        .update({ search_urls: [newUrl] })
        .eq('id', scraper.id);

      if (updateError) {
        console.error(`   ❌ Erreur lors de la mise à jour: ${updateError.message}\n`);
      } else {
        console.log(`   ✅ URL mise à jour avec succès\n`);
      }
    }

    console.log('✅ Mise à jour terminée !');
    console.log('\n💡 Prochaine étape:');
    console.log('   Relancez le scraper depuis le dashboard admin pour scraper toutes les annonces BMW disponibles.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

updateBmwScraperUrl()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });







