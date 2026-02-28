#!/usr/bin/env node

/**
 * Batch AI enrichment for LeBonCoin listings missing fields.
 *
 * Uses GPT-4o-mini to infer power_hp, category, doors, color,
 * displacement, drivetrain, version, transmission from description text.
 *
 * Also attempts to extract location_city from description.
 *
 * Usage: node backend/src/scripts/ai-enrich-leboncoin.js [--limit N] [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
  maxRetries: 2,
});

const BATCH_SIZE = 20;
const CONCURRENCY = 5;
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1], 10) : 99999;

async function enrichListing(listing) {
  const textParts = [
    listing.description,
    listing.brand && listing.model ? `Marque: ${listing.brand}, Modèle: ${listing.model}` : '',
    listing.year ? `Année: ${listing.year}` : '',
    listing.mileage ? `Kilométrage: ${listing.mileage} km` : '',
  ].filter(Boolean);

  const text = textParts.join('\n').substring(0, 3000);
  if (text.length < 30) return null;

  const missingFields = [];
  if (!listing.power_hp) missingFields.push('power_hp');
  if (!listing.category) missingFields.push('category');
  if (!listing.doors) missingFields.push('doors');
  if (!listing.color) missingFields.push('color');
  if (!listing.displacement) missingFields.push('displacement');
  if (!listing.drivetrain) missingFields.push('drivetrain');
  if (!listing.version) missingFields.push('version');
  if (!listing.trim) missingFields.push('trim');
  if (!listing.transmission) missingFields.push('transmission');
  if (!listing.location_city) missingFields.push('location_city');

  if (missingFields.length === 0) return null;

  const prompt = `Tu es un expert automobile. À partir du texte ci-dessous sur un véhicule ${listing.brand || ''} ${listing.model || ''} ${listing.year || ''}, extrais les informations manquantes.

Retourne UNIQUEMENT un JSON valide avec ces clés (null si introuvable) :
- power_hp: nombre de chevaux DIN (pas fiscaux). Déduis du modèle si possible (ex: Peugeot 208 1.2 PureTech = 75-130ch selon version)
- category: "sedan", "suv", "estate", "hatchback", "coupe", "convertible", "mpv", "van", "pickup" (déduis du modèle: 208=hatchback, 3008=suv, 308 SW=estate...)
- doors: 2, 3, 4 ou 5
- color: couleur en français minuscule (noir, blanc, gris, bleu, rouge...)
- displacement: cylindrée en litres (1.2, 1.5, 2.0...)
- drivetrain: "fwd", "rwd" ou "awd" (la plupart des voitures françaises sont fwd)
- version: finition/version (Business, Allure, GT Line, AMG...)
- trim: sous-finition si présente
- transmission: "manual" ou "automatic"
- location_city: ville mentionnée dans le texte

Texte:
${text}

JSON:`;

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu extrais des données structurées de véhicules. Réponds uniquement en JSON valide.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const raw = resp.choices[0]?.message?.content || '';
    const cleaned = raw.trim().replace(/```json\n?|\n?```/g, '');
    const extracted = JSON.parse(cleaned);

    const updates = {};

    if (!listing.power_hp && extracted.power_hp) {
      const hp = parseInt(extracted.power_hp, 10);
      if (hp >= 30 && hp <= 2000) updates.power_hp = hp;
    }
    if (!listing.category && extracted.category) {
      const valid = ['sedan', 'suv', 'estate', 'hatchback', 'coupe', 'convertible', 'mpv', 'van', 'pickup'];
      const cat = String(extracted.category).toLowerCase();
      if (valid.includes(cat)) updates.category = cat;
    }
    if (!listing.doors && extracted.doors) {
      const d = parseInt(extracted.doors, 10);
      if (d >= 2 && d <= 5) updates.doors = d;
    }
    if (!listing.color && extracted.color) {
      updates.color = String(extracted.color).toLowerCase().substring(0, 50);
    }
    if (!listing.displacement && extracted.displacement) {
      const d = parseFloat(extracted.displacement);
      if (d >= 0.6 && d <= 8) updates.displacement = d;
    }
    if (!listing.drivetrain && extracted.drivetrain) {
      const valid = ['fwd', 'rwd', 'awd'];
      if (valid.includes(String(extracted.drivetrain).toLowerCase())) {
        updates.drivetrain = extracted.drivetrain.toLowerCase();
      }
    }
    if (!listing.version && extracted.version && extracted.version !== 'null') {
      updates.version = String(extracted.version).substring(0, 100);
    }
    if (!listing.trim && extracted.trim && extracted.trim !== 'null') {
      updates.trim = String(extracted.trim).substring(0, 100);
    }
    if (!listing.transmission && extracted.transmission) {
      const t = String(extracted.transmission).toLowerCase();
      if (['manual', 'automatic'].includes(t)) updates.transmission = t;
    }
    if (!listing.location_city && extracted.location_city && extracted.location_city !== 'null') {
      updates.location_city = String(extracted.location_city).substring(0, 100);
    }

    return Object.keys(updates).length > 0 ? updates : null;
  } catch (err) {
    return null;
  }
}

async function processBatch(listings) {
  const chunks = [];
  for (let i = 0; i < listings.length; i += CONCURRENCY) {
    chunks.push(listings.slice(i, i + CONCURRENCY));
  }

  let updated = 0;
  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (listing) => {
        const updates = await enrichListing(listing);
        return { listing, updates };
      })
    );

    for (const { listing, updates } of results) {
      if (!updates) continue;

      if (DRY_RUN) {
        console.log(`  [DRY] ${listing.id}: ${JSON.stringify(updates)}`);
        updated++;
        continue;
      }

      const { error } = await sb
        .from('listings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', listing.id);

      if (error) {
        console.log(`  ERR ${listing.id}: ${error.message}`);
      } else {
        const fields = Object.keys(updates).join(', ');
        console.log(`  OK ${listing.brand} ${listing.model} ${listing.year}: ${fields}`);
        updated++;
      }
    }
  }
  return updated;
}

async function main() {
  console.log(`=== AI Enrichment for LeBonCoin Listings ===${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set in environment');
    process.exit(1);
  }

  let totalProcessed = 0;
  let totalUpdated = 0;
  let offset = 0;

  while (totalProcessed < LIMIT) {
    const batchLimit = Math.min(BATCH_SIZE, LIMIT - totalProcessed);

    const { data: listings, error } = await sb
      .from('listings')
      .select('id, brand, model, year, mileage, description, power_hp, category, doors, color, displacement, drivetrain, version, trim, transmission, location_city, fuel_type')
      .eq('source_platform', 'leboncoin')
      .or('power_hp.is.null,category.is.null,doors.is.null,color.is.null,transmission.is.null,location_city.is.null')
      .not('description', 'is', null)
      .range(offset, offset + batchLimit - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error('DB fetch error:', error.message);
      break;
    }
    if (!listings || listings.length === 0) {
      console.log('No more listings to process');
      break;
    }

    console.log(`Batch ${Math.floor(offset / BATCH_SIZE) + 1}: processing ${listings.length} listings...`);
    const batchUpdated = await processBatch(listings);
    totalUpdated += batchUpdated;
    totalProcessed += listings.length;
    offset += batchLimit;

    console.log(`  Batch result: ${batchUpdated}/${listings.length} enriched (total: ${totalUpdated}/${totalProcessed})\n`);
  }

  console.log(`\n=== Done: ${totalUpdated} listings enriched out of ${totalProcessed} processed ===`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
