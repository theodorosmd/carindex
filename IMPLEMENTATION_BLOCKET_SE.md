# 🔧 Implémentation Blocket.se pour la Suède

## Vue d'ensemble

Blocket.se est le plus grand site de petites annonces en Suède (équivalent de Leboncoin en France). Pour avoir des données de vente suédoises dans les Market Insights, il faut implémenter le scraping de Blocket.se.

---

## 📋 Étapes d'Implémentation

### 1. Créer un Acteur Apify pour Blocket.se

**Option A : Utiliser un acteur existant sur Apify Store**
- Chercher "blocket scraper" ou "blocket.se" dans Apify Store
- Si disponible, utiliser l'acteur existant

**Option B : Créer un acteur personnalisé**
- Créer un nouvel acteur dans Apify
- Utiliser CheerioCrawler ou PuppeteerCrawler
- Structure similaire à `apify/actors/autoscout24-scraper/`

### 2. Ajouter le Support dans le Backend

#### 2.1 Ajouter dans `autoScraperService.js`

```javascript
// Dans backend/src/services/autoScraperService.js

case 'blocket':
  result = await runBlocketScraper(scraper.search_urls, options, progressCallback);
  break;
```

#### 2.2 Créer `blocketService.js`

Créer `backend/src/services/blocketService.js` :

```javascript
import { ApifyClient } from 'apify-client';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

export async function runBlocketScraper(searchUrls, options = {}, progressCallback = null) {
  try {
    const actorId = process.env.APIFY_BLOCKET_ACTOR_ID || 'your-actor-id';
    
    // Configuration similaire à runAutoScout24Scraper
    const run = await client.actor(actorId).call({
      startUrls: searchUrls.map(url => ({ url })),
      maxPages: options.maxPages || 1000,
      // Autres options spécifiques à Blocket
    });

    // Traiter les résultats et les sauvegarder
    // Mapping similaire à AutoScout24
    
    return {
      totalScraped: result.totalScraped,
      saved: result.saved,
      runId: run.id
    };
  } catch (error) {
    logger.error('Error running Blocket scraper', { error: error.message });
    throw error;
  }
}
```

#### 2.3 Mapping des Données Blocket → Listings

Dans `blocketService.js`, créer une fonction de mapping :

```javascript
function mapBlocketDataToListing(item) {
  return {
    source_platform: 'blocket',
    source_listing_id: item.id || item.listingId,
    brand: normalizeBrand(item.brand || item.make),
    model: normalizeModel(item.model),
    year: extractYear(item.year || item.modelYear),
    mileage: convertMileage(item.mileage || item.mileageKm),
    price: parseFloat(item.price || item.priceSek),
    currency: 'SEK',
    location_city: item.location?.city || item.city,
    location_region: item.location?.region || item.region,
    location_country: 'SE',
    seller_type: item.sellerType || (item.dealer ? 'dealer' : 'private'),
    fuel_type: normalizeFuelType(item.fuelType || item.fuel),
    transmission: normalizeTransmission(item.transmission || item.gearbox),
    url: item.url || item.link,
    images: item.images || [],
    specifications: {
      power_hp: item.power || item.horsepower,
      displacement: item.engineSize,
      color: item.color,
      doors: item.doors,
      // ... autres spécifications
    },
    posted_date: parseDate(item.postedDate || item.date),
    description: item.description || item.text
  };
}
```

### 3. Configuration dans le Dashboard Admin

Une fois le service implémenté, créer un scraper automatique :

1. Aller dans `#/admin`
2. Créer un nouveau scraping automatique
3. Configuration :
   - **Nom** : `Blocket.se - Suède`
   - **Source** : `blocket`
   - **URLs de recherche** :
     - `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`
     - Ou par région si nécessaire
   - **Fréquence** : Toutes les 6 heures (`0 */6 * * *`)
   - **Max pages** : 1000

### 4. Variables d'Environnement

Ajouter dans `.env` :

```bash
APIFY_BLOCKET_ACTOR_ID=your-actor-id-here
```

---

## 🔍 Structure des URLs Blocket.se

### URLs de Recherche

**Toutes les voitures en Suède** :
```
https://www.blocket.se/annonser/hela_sverige/fordon/bilar
```

**Par région** :
```
https://www.blocket.se/annonser/stockholm/fordon/bilar
https://www.blocket.se/annonser/goteborg/fordon/bilar
https://www.blocket.se/annonser/malmo/fordon/bilar
```

**Avec filtres** :
```
https://www.blocket.se/annonser/hela_sverige/fordon/bilar?q=BMW
https://www.blocket.se/annonser/hela_sverige/fordon/bilar?price_min=100000&price_max=500000
```

---

## 📊 Données à Extraire

### Champs Requis
- `id` / `listingId` : Identifiant unique
- `brand` / `make` : Marque
- `model` : Modèle
- `year` / `modelYear` : Année
- `mileage` / `mileageKm` : Kilométrage
- `price` / `priceSek` : Prix en SEK
- `location` : Ville et région
- `url` / `link` : URL de l'annonce

### Champs Optionnels
- `fuelType` / `fuel` : Type de carburant
- `transmission` / `gearbox` : Transmission
- `power` / `horsepower` : Puissance
- `color` : Couleur
- `doors` : Nombre de portes
- `sellerType` : Type de vendeur
- `images` : Images
- `description` : Description

---

## ✅ Vérification

Après implémentation, vérifier que les données arrivent :

```sql
-- Vérifier les listings Blocket
SELECT 
  source_platform,
  status,
  COUNT(*) as count,
  MAX(last_seen) as last_update
FROM listings
WHERE source_platform = 'blocket' 
  AND location_country = 'SE'
GROUP BY source_platform, status;
```

---

## 🚀 Alternative : Bilbasen.se

Si Blocket.se est trop complexe, **Bilbasen.se** est une alternative plus spécialisée :

- **URL** : `https://www.bilbasen.se/`
- **Avantage** : Site spécialisé voitures, structure plus simple
- **Implémentation** : Même processus que Blocket.se

---

## 📝 Notes

- Les données doivent être stockées avec `location_country = 'SE'`
- Le système détectera automatiquement les ventes (`status = 'sold'`)
- Une fois des ventes détectées, elles apparaîtront dans les Market Insights
