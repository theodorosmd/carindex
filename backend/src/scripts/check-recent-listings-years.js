import { supabase } from '../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script pour vérifier les années des annonces récentes
 */
async function checkRecentListingsYears() {
  try {
    console.log('🔍 Vérification des années des annonces récentes...\n');

    // Get recent listings
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, brand, model, year, mileage, price, url, specifications, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Erreur:', error.message);
      process.exit(1);
    }

    if (!listings || listings.length === 0) {
      console.log('📭 Aucune annonce trouvée.\n');
      return;
    }

    console.log(`📊 ${listings.length} annonce(s) récente(s):\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const currentYear = new Date().getFullYear();
    let suspiciousCount = 0;

    listings.forEach((listing, index) => {
      const isSuspicious = listing.year > currentYear + 1 || listing.year < 1950;
      if (isSuspicious) suspiciousCount++;
      
      const status = isSuspicious ? '⚠️' : '✅';
      console.log(`${status} ${index + 1}. ${listing.brand} ${listing.model} (${listing.year})`);
      console.log(`   ID: ${listing.id}`);
      console.log(`   Kilométrage: ${listing.mileage.toLocaleString('fr-FR')} km`);
      console.log(`   Prix: ${listing.price.toLocaleString('fr-FR')} €`);
      
      if (listing.specifications) {
        const specs = typeof listing.specifications === 'string' 
          ? JSON.parse(listing.specifications) 
          : listing.specifications;
        const firstReg = specs.firstRegistration || specs.first_registration || specs.registrationYear;
        if (firstReg) {
          console.log(`   📅 First Registration (dans specs): ${firstReg}`);
        }
      }
      
      if (isSuspicious) {
        console.log(`   ⚠️  ANNÉE SUSPECTE: ${listing.year} (année actuelle: ${currentYear})`);
      }
      
      console.log(`   URL: ${listing.url || 'N/A'}`);
      console.log('');
    });

    if (suspiciousCount > 0) {
      console.log(`\n⚠️  ${suspiciousCount} annonce(s) avec une année suspecte détectée(s).`);
      console.log('💡 Exécutez: node src/scripts/fix-incorrect-years.js pour corriger automatiquement.\n');
    } else {
      console.log('✅ Toutes les années semblent correctes.\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkRecentListingsYears();







