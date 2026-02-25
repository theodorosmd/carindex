import { supabase } from '../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script pour vérifier le nombre d'annonces dans la base de données
 */
async function checkListingsCount() {
  try {
    console.log('🔍 Vérification du nombre d\'annonces...\n');

    // Total d'annonces
    const { count: total, error: totalError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ Erreur lors du comptage total:', totalError.message);
      process.exit(1);
    }

    // Annonces actives
    const { count: active, error: activeError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeError) {
      console.error('❌ Erreur lors du comptage actives:', activeError.message);
      process.exit(1);
    }

    // Par source
    const { data: bySource, error: sourceError } = await supabase
      .from('listings')
      .select('source_platform')
      .eq('status', 'active');

    if (sourceError) {
      console.error('❌ Erreur lors du comptage par source:', sourceError.message);
      process.exit(1);
    }

    const sourceCounts = {};
    (bySource || []).forEach(listing => {
      const source = listing.source_platform || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    // Annonces créées aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount, error: todayError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (todayError) {
      console.error('❌ Erreur lors du comptage aujourd\'hui:', todayError.message);
      process.exit(1);
    }

    // Annonces créées cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: weekCount, error: weekError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    if (weekError) {
      console.error('❌ Erreur lors du comptage cette semaine:', weekError.message);
      process.exit(1);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Statistiques des annonces');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total d'annonces: ${total?.toLocaleString('fr-FR') || 0}`);
    console.log(`Annonces actives: ${active?.toLocaleString('fr-FR') || 0}`);
    console.log(`Créées aujourd'hui: ${todayCount?.toLocaleString('fr-FR') || 0}`);
    console.log(`Créées cette semaine: ${weekCount?.toLocaleString('fr-FR') || 0}`);
    console.log('');
    console.log('📋 Répartition par source:');
    Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        const percentage = ((count / (active || 1)) * 100).toFixed(1);
        console.log(`  ${source}: ${count.toLocaleString('fr-FR')} (${percentage}%)`);
      });
    console.log('');

    // Vérifier les scrapings automatiques
    const { data: scrapers, error: scrapersError } = await supabase
      .from('auto_scrapers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!scrapersError && scrapers && scrapers.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 Statut des scrapings automatiques');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      scrapers.forEach((scraper, index) => {
        const lastRun = scraper.last_run_at 
          ? new Date(scraper.last_run_at).toLocaleString('fr-FR')
          : 'Jamais';
        const result = scraper.last_run_result || {};
        console.log(`${index + 1}. ${scraper.name} (${scraper.source})`);
        console.log(`   Statut: ${scraper.enabled ? '✅ Actif' : '⏸️ Inactif'}`);
        console.log(`   Dernière exécution: ${lastRun}`);
        console.log(`   Statut: ${scraper.last_run_status || 'N/A'}`);
        if (result.totalScraped) {
          console.log(`   📊 Scrapé: ${result.totalScraped.toLocaleString('fr-FR')} annonces`);
          console.log(`   💾 Sauvegardé: ${(result.saved || 0).toLocaleString('fr-FR')} annonces`);
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkListingsCount();







