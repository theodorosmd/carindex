#!/usr/bin/env node
/**
 * Vérifier l'avancement de l'import Django mobile.de
 * Utilise les mêmes filtres (DJANGO_API_CARS_QUERY) que l'import
 *
 * Run: node src/scripts/check-django-import-progress.js
 */
import 'dotenv/config';
import { loginDjango } from '../jobs/djangoImportJob.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const baseUrl = process.env.DJANGO_MOBILEDE_BASE_URL;
  if (!baseUrl) {
    console.error('DJANGO_MOBILEDE_BASE_URL required. Set in .env (see .env.example).');
    process.exit(1);
  }
  const query = process.env.DJANGO_API_CARS_QUERY || '';

  console.log('🔍 Vérification de l\'avancement Django import...\n');

  try {
    const cookies = await loginDjango({
      baseUrl,
      username: process.env.DJANGO_MOBILEDE_USERNAME || process.env.DJANGO_API_USERNAME,
      password: process.env.DJANGO_MOBILEDE_PASSWORD || process.env.DJANGO_API_PASSWORD
    });

    let url = `${baseUrl}/api/cars/?limit=10`;
    if (query) url += `&${query.replace(/^\?/, '')}`;

    const res = await fetch(url, {
      headers: {
        Cookie: Object.entries(cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join('; ')
      }
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    const totalCount = data.count ?? 0;
    const pageSize = (data.results || []).length || 10;
    const totalPages = Math.ceil(totalCount / pageSize);

    let lastPage = null;
    try {
      const logPath = join(__dirname, '../../django-mobilede.log');
      const log = readFileSync(logPath, 'utf-8');
      const match = log.match(/"page":(\d+)/g);
      if (match) {
        lastPage = parseInt(match[match.length - 1].replace('"page":', ''), 10);
      }
    } catch {
      // log file may not exist
    }

    const progress = lastPage != null && totalPages > 0
      ? ((lastPage / totalPages) * 100).toFixed(1)
      : null;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Django Import (mobile.de)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Filtre: ${query || '(aucun)'}`);
    console.log(`Total listings Django: ${totalCount.toLocaleString('fr-FR')}`);
    console.log(`Pages totales (~${pageSize}/page): ${totalPages.toLocaleString('fr-FR')}`);
    if (lastPage != null) {
      console.log(`Dernière page traitée: ${lastPage.toLocaleString('fr-FR')}`);
      if (progress != null) {
        console.log(`Avancement: ${progress}%`);
      }
    } else {
      console.log('Dernière page: (log non trouvé ou import non démarré)');
    }
    console.log('');

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

main();
