/**
 * Script to fix incorrect prices in comparable_listings table
 * 
 * This script identifies and flags prices that are suspiciously high
 * for the vehicle age, and can optionally delete or update them.
 * 
 * Usage: node backend/src/scripts/fix-incorrect-prices.js [--delete] [--update]
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env from backend directory BEFORE importing supabase
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = resolve(__dirname, '../..');
const envPath = resolve(backendRoot, '.env');
dotenv.config({ path: envPath });

// Now import supabase (which also loads dotenv, but we've already loaded it)
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const currentYear = new Date().getFullYear();

/**
 * Check if a price is reasonable for a vehicle of given year
 */
function isPriceReasonable(price, year) {
  if (!year || year < 1990 || year > currentYear + 1) {
    return false;
  }
  
  const age = currentYear - year;
  
  // Very new cars (0-2 years): can be up to 200k
  if (age <= 2) {
    return price <= 200000;
  }
  
  // Recent cars (3-5 years): should be under 150k
  if (age <= 5) {
    return price <= 150000;
  }
  
  // Older cars (6-10 years): should be under 100k
  if (age <= 10) {
    return price <= 100000;
  }
  
  // Very old cars (10+ years): should be under 50k
  return price <= 50000;
}

async function fixIncorrectPrices() {
  try {
    console.log('🔍 Recherche des prix incorrects dans comparable_listings...\n');
    
    // Fetch all comparable listings with suspicious prices
    // Check both > 200k (definitely wrong) and 100k-200k (suspicious for older cars)
    const { data: listings, error } = await supabase
      .from('comparable_listings')
      .select('id, url, title, price_eur, year, mileage_km, created_at')
      .gt('price_eur', 100000) // Focus on prices above 100k
      .order('price_eur', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    if (!listings || listings.length === 0) {
      console.log('✅ Aucun prix suspect trouvé.');
      return;
    }
    
    console.log(`📊 ${listings.length} listings avec prix > 100k EUR trouvés\n`);
    
    const suspicious = [];
    const toDelete = [];
    const toUpdate = [];
    
    for (const listing of listings) {
      const isReasonable = isPriceReasonable(listing.price_eur, listing.year);
      
      if (!isReasonable) {
        const age = listing.year ? currentYear - listing.year : 'N/A';
        suspicious.push({
          id: listing.id,
          url: listing.url,
          title: listing.title?.substring(0, 60) || 'N/A',
          price: listing.price_eur,
          year: listing.year,
          age,
          mileage: listing.mileage_km
        });
        
        // Flag for deletion if price is clearly wrong
        // - Price > 200k: definitely wrong
        // - Price > 100k and car is > 5 years old: suspicious
        // - Price > 150k and car is > 2 years old: suspicious
        const shouldDelete = listing.price_eur > 200000 || 
          (listing.year && (currentYear - listing.year) > 5 && listing.price_eur > 100000) ||
          (listing.year && (currentYear - listing.year) > 2 && listing.price_eur > 150000);
        
        if (shouldDelete) {
          toDelete.push(listing.id);
        }
      }
    }
    
    console.log(`⚠️  ${suspicious.length} prix suspects identifiés:\n`);
    suspicious.slice(0, 20).forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.title}`);
      console.log(`   Prix: ${item.price.toLocaleString('fr-FR')} € | Année: ${item.year} (${item.age} ans) | Km: ${item.mileage?.toLocaleString('fr-FR') || 'N/A'}`);
      console.log(`   URL: ${item.url}`);
      console.log('');
    });
    
    if (suspicious.length > 20) {
      console.log(`   ... et ${suspicious.length - 20} autres\n`);
    }
    
    console.log(`\n📋 Résumé:`);
    console.log(`   ⚠️  Prix suspects: ${suspicious.length}`);
    console.log(`   🗑️  À supprimer: ${toDelete.length}`);
    
    // Ask for confirmation before deleting
    if (toDelete.length > 0) {
      console.log(`\n⚠️  ATTENTION: ${toDelete.length} listings seront supprimés.`);
      console.log(`   Pour supprimer, exécutez: node backend/src/scripts/fix-incorrect-prices.js --delete`);
      console.log(`   Pour mettre à jour avec prix = 0 (marquer comme invalide), exécutez: node backend/src/scripts/fix-incorrect-prices.js --update\n`);
    }
    
    // Handle deletion if --delete flag is set
    if (process.argv.includes('--delete') && toDelete.length > 0) {
      console.log(`\n🗑️  Suppression de ${toDelete.length} listings avec prix incorrects...`);
      
      const { error: deleteError } = await supabase
        .from('comparable_listings')
        .delete()
        .in('id', toDelete);
      
      if (deleteError) {
        throw deleteError;
      }
      
      console.log(`✅ ${toDelete.length} listings supprimés avec succès.`);
    }
    
    // Handle update if --update flag is set
    if (process.argv.includes('--update') && suspicious.length > 0) {
      console.log(`\n🔄 Mise à jour de ${suspicious.length} listings (prix = 0 pour marquer comme invalide)...`);
      
      const suspiciousIds = suspicious.map(s => s.id);
      const { error: updateError } = await supabase
        .from('comparable_listings')
        .update({ price_eur: 0 })
        .in('id', suspiciousIds);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`✅ ${suspicious.length} listings mis à jour avec succès.`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    logger.error('Error fixing incorrect prices', error);
    throw error;
  }
}

// Run the script
fixIncorrectPrices()
  .then(() => {
    console.log('\n✅ Script terminé.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
