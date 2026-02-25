import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script pour corriger les années incorrectes dans les annonces
 * Les annonces avec une année > année actuelle + 1 sont probablement incorrectes
 */
async function fixIncorrectYears() {
  try {
    const currentYear = new Date().getFullYear();
    const maxValidYear = currentYear + 1; // Allow current year + 1 for new models
    
    console.log(`🔍 Recherche des annonces avec une année > ${maxValidYear}...\n`);

    // Find listings with invalid years
    const { data: invalidListings, error: findError } = await supabase
      .from('listings')
      .select('id, year, url, brand, model, specifications')
      .gt('year', maxValidYear);

    if (findError) {
      console.error('❌ Erreur lors de la recherche:', findError.message);
      process.exit(1);
    }

    if (!invalidListings || invalidListings.length === 0) {
      console.log('✅ Aucune annonce avec une année incorrecte trouvée.\n');
      return;
    }

    console.log(`⚠️  ${invalidListings.length} annonce(s) avec une année incorrecte trouvée(s):\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const listing of invalidListings) {
      console.log(`📋 Annonce ID: ${listing.id}`);
      console.log(`   Année actuelle: ${listing.year}`);
      console.log(`   URL: ${listing.url || 'N/A'}`);
      
      // Try to extract year from specifications or URL
      let correctedYear = null;
      
      // Check specifications for firstRegistration or similar
      if (listing.specifications) {
        const specs = typeof listing.specifications === 'string' 
          ? JSON.parse(listing.specifications) 
          : listing.specifications;
        
        const firstReg = specs.firstRegistration || specs.first_registration || specs.registrationYear || specs.registration_year;
        if (firstReg) {
          if (typeof firstReg === 'string') {
            const yearMatch = firstReg.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
              correctedYear = parseInt(yearMatch[0]);
            }
          } else if (firstReg instanceof Date) {
            correctedYear = firstReg.getFullYear();
          } else {
            correctedYear = parseInt(firstReg);
          }
        }
      }
      
      // If still no year, try to extract from URL or use a reasonable default
      if (!correctedYear || correctedYear < 1900 || correctedYear > maxValidYear) {
        // Try to extract from URL patterns (some sites include year in URL)
        if (listing.url) {
          const urlYearMatch = listing.url.match(/\b(19|20)\d{2}\b/);
          if (urlYearMatch) {
            const urlYear = parseInt(urlYearMatch[0]);
            if (urlYear >= 1900 && urlYear <= maxValidYear) {
              correctedYear = urlYear;
            }
          }
        }
      }
      
      // If still no valid year, set to null (will need manual correction)
      if (!correctedYear || correctedYear < 1900 || correctedYear > maxValidYear) {
        console.log(`   ⚠️  Impossible de déterminer l'année correcte - à corriger manuellement`);
        skippedCount++;
        console.log('');
        continue;
      }
      
      console.log(`   ✅ Année corrigée: ${listing.year} → ${correctedYear}`);
      
      // Update the listing
      const { error: updateError } = await supabase
        .from('listings')
        .update({ 
          year: correctedYear,
          updated_at: new Date().toISOString()
        })
        .eq('id', listing.id);
      
      if (updateError) {
        console.error(`   ❌ Erreur lors de la mise à jour: ${updateError.message}`);
        skippedCount++;
      } else {
        fixedCount++;
      }
      
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Résumé:');
    console.log(`   ✅ Corrigées: ${fixedCount}`);
    console.log(`   ⚠️  Non corrigées (nécessitent une correction manuelle): ${skippedCount}`);
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

fixIncorrectYears();







