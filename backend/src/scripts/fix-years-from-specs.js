import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script pour corriger les années en extrayant depuis les specifications
 * Cherche firstRegistration dans les specifications et met à jour l'année
 */
async function fixYearsFromSpecs() {
  try {
    const currentYear = new Date().getFullYear();
    const maxValidYear = currentYear + 1;
    
    console.log(`🔍 Recherche des annonces avec une année >= ${currentYear} pour extraction depuis les specs...\n`);

    // Find listings with year >= current year (likely incorrect)
    const { data: listings, error: findError } = await supabase
      .from('listings')
      .select('id, year, brand, model, url, specifications')
      .gte('year', currentYear);

    if (findError) {
      console.error('❌ Erreur lors de la recherche:', findError.message);
      process.exit(1);
    }

    if (!listings || listings.length === 0) {
      console.log('✅ Aucune annonce à corriger.\n');
      return;
    }

    console.log(`📋 ${listings.length} annonce(s) trouvée(s) avec année >= ${currentYear}\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let noSpecsCount = 0;

    for (const listing of listings) {
      console.log(`📋 ${listing.brand} ${listing.model} (année actuelle: ${listing.year})`);
      
      let correctedYear = null;
      
      // Parse specifications
      if (listing.specifications) {
        let specs;
        try {
          specs = typeof listing.specifications === 'string' 
            ? JSON.parse(listing.specifications) 
            : listing.specifications;
        } catch (e) {
          console.log(`   ⚠️  Impossible de parser les specifications`);
          noSpecsCount++;
          skippedCount++;
          console.log('');
          continue;
        }
        
        // Try to find firstRegistration in various formats
        const firstReg = specs.firstRegistration || specs.first_registration || 
                        specs.registrationYear || specs.registration_year ||
                        specs.erstzulassung || specs.firstRegistrationDate ||
                        specs.registration_date || specs.registrationDate;
        
        if (firstReg) {
          if (typeof firstReg === 'string') {
            // Extract year from formats like "08/2005", "2005-08", "2005", etc.
            const yearMatch = firstReg.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
              correctedYear = parseInt(yearMatch[0]);
            } else {
              correctedYear = parseInt(firstReg);
            }
          } else if (firstReg instanceof Date) {
            correctedYear = firstReg.getFullYear();
          } else {
            correctedYear = parseInt(firstReg);
          }
          
          // Validate year
          if (correctedYear && correctedYear >= 1900 && correctedYear < currentYear) {
            console.log(`   ✅ Année trouvée dans specs: ${correctedYear}`);
          } else {
            console.log(`   ⚠️  Année extraite invalide: ${correctedYear}`);
            correctedYear = null;
          }
        } else {
          console.log(`   ⚠️  Pas de firstRegistration dans les specifications`);
          noSpecsCount++;
        }
      } else {
        console.log(`   ⚠️  Pas de specifications disponibles`);
        noSpecsCount++;
      }
      
      if (!correctedYear) {
        skippedCount++;
        console.log('');
        continue;
      }
      
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
        console.log(`   ✅ Année mise à jour: ${listing.year} → ${correctedYear}`);
        fixedCount++;
      }
      
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Résumé:');
    console.log(`   ✅ Corrigées: ${fixedCount}`);
    console.log(`   ⚠️  Non corrigées (pas de specs ou année invalide): ${skippedCount}`);
    console.log(`   📭 Sans specifications: ${noSpecsCount}`);
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

fixYearsFromSpecs();







