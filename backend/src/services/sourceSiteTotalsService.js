/**
 * Fetch and persist total vehicles available on each marketplace.
 * Used for "% scrapé" (our listings / site total) in the admin dashboard.
 */
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { fetchViaScrapeDo, isScrapeDoAvailable } from '../utils/scrapeDo.js';

function parseNum(str) {
  if (!str) return null;
  const n = parseInt(str.replace(/[\s,.]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function tryPatterns(html, patterns) {
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) {
      const n = parseNum(m[1]);
      if (n != null && n > 0 && n < 50_000_000) return n;
    }
  }
  return null;
}

const SOURCE_CONFIG = {
  autoscout24: {
    url: 'https://www.autoscout24.de/lst?sort=standard&desc=0&offer=U&ustate=N%2CU&atype=C',
    geoCode: 'de',
    patterns: [
      /(\d[\d\s,]*)\s*(?:Fahrzeuge|Angebote|annonces|offers)/i,
    ]
  },
  'mobile.de': {
    url: 'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car',
    geoCode: 'de',
    patterns: [
      /(\d[\d\s,.]*)\s*Angebote/i,  // "1.418.365 Angebote"
      /(\d[\d\s,.]*)\s*(?:Fahrzeuge|Fahrzeug)/i,
      /(?:insgesamt|total|gesamt)\s*[:\s]*(\d[\d\s,.]*)/i,
    ]
  },
  leboncoin: {
    url: 'https://www.leboncoin.fr/c/voitures',
    geoCode: 'fr',
    patterns: [
      /Résultats de recherche :\s*(\d[\d\s]*)\s*annonces/i,
      /(\d[\d\s]*)\s*annonces(?!\s*à)/i,
    ]
  },
  largus: {
    url: 'https://occasion.largus.fr/auto/?npp=15',
    geoCode: 'fr',
    patterns: [
      /(\d[\d\s]*)\s*annonces?\s*(?:occasion|&|et)/i,  // "469001 annonces occasion & neufs"
      /(\d[\d\s]*)\s*(?:véhicules?|annonces?)/i,
      /(?:résultats?|trouvé)\s*[:\s]*(\d[\d\s]*)/i,
    ]
  },
  lacentrale: {
    url: 'https://www.lacentrale.fr/listing',
    geoCode: 'fr',
    patterns: [
      /Rechercher\s*\((\d[\d\s]*)\)/i,  // "Rechercher (385 551)"
      /(\d[\d\s]*)\s*(?:annonces?|véhicules?)/i,
      /(?:résultats?|annonces?)\s*[:\s]*(\d[\d\s]*)/i,
    ]
  },
  gaspedaal: {
    url: 'https://www.gaspedaal.nl/zoeken?srt=df-a',
    geoCode: 'nl',
    patterns: [
      /(\d[\d\s.]*)\s*(?:auto\'s?|voertuigen)/i,
      /(?:totaal|results?)\s*[:\s]*(\d[\d\s.]*)/i,
    ]
  },
  marktplaats: {
    url: 'https://www.marktplaats.nl/l/auto-s/#f:10882',
    geoCode: 'nl',
    patterns: [
      /(\d[\d\s.]*)\s*(?:resultaten?|aanbiedingen?)/i,
      /(?:totaal|aantal)\s*[:\s]*(\d[\d\s.]*)/i,
    ]
  },
  subito: {
    url: 'https://www.subito.it/auto-usate/italia',
    geoCode: 'it',
    patterns: [
      /(\d[\d\s.]*)\s*(?:annunci|risultati)/i,
      /(?:risultati?|annunci)\s*[:\s]*(\d[\d\s.]*)/i,
    ]
  },
  'coches.net': {
    url: 'https://www.coches.net/segunda-mano/coches',
    geoCode: 'es',
    patterns: [
      /(\d[\d\s.]*)\s*(?:coches?|anuncios?)/i,
      /(?:resultados?|coches?)\s*[:\s]*(\d[\d\s.]*)/i,
    ]
  },
  blocket: {
    url: 'https://www.blocket.se/mobility/search/car',
    geoCode: 'se',
    patterns: [
      /(\d[\d\s]*)\s*resultat/i,  // "134 998 resultat"
      /(\d[\d\s]*)\s*(?:annonser|bilar)/i,
      /(?:resultat|annonser)\s*[:\s]*(\d[\d\s]*)/i,
    ]
  },
  bilweb: {
    url: 'https://www.bilweb.se/bilar',
    geoCode: 'se',
    patterns: [
      /(\d[\d\s]*)\s*(?:bilar|fordon|annonser)/i,
      /(?:resultat|bilar)\s*[:\s]*(\d[\d\s]*)/i,
    ]
  },
  bytbil: {
    url: 'https://www.bytbil.com/',
    geoCode: 'se',
    patterns: [
      /(\d[\d\s]*)\s*fordon/i,
    ]
  },
  finn: {
    url: 'https://www.finn.no/mobility/search/car?registration_class=1',
    geoCode: 'no',
    patterns: [
      /(\d[\d\s]*)\s*(?:annonser|biler)/i,
      /(?:resultater?|annonser)\s*[:\s]*(\d[\d\s]*)/i,
    ]
  },
  otomoto: {
    url: 'https://www.otomoto.pl/osobowe',
    geoCode: 'pl',
    patterns: [
      /(\d[\d\s]*)\s*(?:ogłoszeń|samochodów)/i,
      /(?:wyników?|ogłoszeń)\s*[:\s]*(\d[\d\s]*)/i,
    ]
  },
  '2ememain': {
    url: 'https://www.2ememain.be/l/autos/#f:10882',
    geoCode: 'be',
    patterns: [
      /(\d[\d\s]*)\s*(?:annonces?|résultats?|resultaten?)/i,
      /(?:résultats?|annonces?)\s*[:\s]*(\d[\d\s]*)/i,
    ]
  }
};

/**
 * Fetch site total for one source and persist.
 */
export async function fetchAndPersistSiteTotal(source) {
  const cfg = SOURCE_CONFIG[source];
  if (!cfg || !isScrapeDoAvailable()) return null;
  try {
    const html = await fetchViaScrapeDo(cfg.url, {
      render: true,
      customWait: 4000,
      geoCode: cfg.geoCode || 'de'
    });
    const total = tryPatterns(html, cfg.patterns);
    if (total == null || total <= 0) return null;
    const { error } = await supabase
      .from('source_site_totals')
      .upsert(
        { source_platform: source, total_available: total, last_updated: new Date().toISOString() },
        { onConflict: 'source_platform' }
      );
    if (error) {
      logger.warn('Could not upsert site total', { source, error: error.message });
      return null;
    }
    logger.info('Site total updated', { source, total });
    return total;
  } catch (err) {
    logger.warn('Failed to fetch site total', { source, error: err.message });
    return null;
  }
}

/**
 * Refresh all site totals. Runs sequentially to avoid rate limits.
 */
export async function refreshAllSiteTotals() {
  const results = {};
  for (const source of Object.keys(SOURCE_CONFIG)) {
    const total = await fetchAndPersistSiteTotal(source);
    results[source] = total;
    await new Promise((r) => setTimeout(r, 2000)); // delay between requests
  }
  return results;
}
