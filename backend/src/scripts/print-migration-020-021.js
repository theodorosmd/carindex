#!/usr/bin/env node
/**
 * Affiche le SQL des migrations 020 et 021 pour exécution manuelle dans Supabase.
 * Utiliser si npm run migrate:020 échoue (réseau, DATABASE_URL, etc.)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '../database/migrations');

console.log('-- Exécuter dans Supabase SQL Editor: https://supabase.com/dashboard > SQL Editor\n');
console.log(readFileSync(join(dir, '020_add_mobile_de_fetch_queue.sql'), 'utf8'));
console.log(readFileSync(join(dir, '021_fix_displacement_column.sql'), 'utf8'));
console.log('\n-- Fin');
