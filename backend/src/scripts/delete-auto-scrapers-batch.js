#!/usr/bin/env node
/**
 * Supprime les auto-scrapers AutoScout24, LeBonCoin et Blocket.se
 * Usage: node src/scripts/delete-auto-scrapers-batch.js
 */
import { supabase } from '../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const SOURCES_TO_DELETE = ['autoscout24', 'leboncoin', 'blocket'];

async function deleteAutoScrapers() {
  try {
    const { data: scrapers, error: listError } = await supabase
      .from('auto_scrapers')
      .select('id, name, source')
      .in('source', SOURCES_TO_DELETE);

    if (listError) {
      console.error('❌ Erreur:', listError.message);
      process.exit(1);
    }

    if (!scrapers || scrapers.length === 0) {
      console.log('📭 Aucun scraper à supprimer.');
      return;
    }

    console.log(`🗑️  Suppression de ${scrapers.length} scraper(s)...\n`);
    scrapers.forEach((s) => console.log(`   - ${s.source}: ${s.name}`));

    const ids = scrapers.map((s) => s.id);
    const { error: delError } = await supabase
      .from('auto_scrapers')
      .delete()
      .in('id', ids);

    if (delError) {
      console.error('❌ Erreur suppression:', delError.message);
      process.exit(1);
    }

    console.log(`\n✅ ${scrapers.length} scraper(s) supprimé(s).`);
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

deleteAutoScrapers();
