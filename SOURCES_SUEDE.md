# 🇸🇪 Sources de Données pour la Suède

## Vue d'ensemble

Pour obtenir les données de voitures en Suède (SE) pour les Market Insights, vous avez plusieurs options :

---

## ✅ Sources Actuellement Disponibles

### 1. **Enchères Suédoises (KVD & autres)**

**Status** : ✅ **Déjà implémenté**

Le système peut parser les URLs d'enchères suédoises :
- **KVD.se** (`https://www.kvd.se/auktion/...`)
- **Auktionsverket.se**
- **Auctionet.se**
- **Bilwebauktion.se**

**Utilisation** :
- Ces données sont utilisées pour les **évaluations de marge** (auction margin calculator)
- Les données sont stockées dans `auction_listings` avec `source = 'kvd'` ou `'swedish_auction'`
- **Limitation** : Ce sont des enchères, pas des ventes de particuliers/professionnels

**Comment ajouter des données** :
- Utiliser le calculateur de marge : `#/auction-margin`
- Coller des URLs d'enchères KVD
- Les données sont parsées et stockées automatiquement

---

## 🔧 Sources à Configurer pour les Listings (Ventes)

**⚠️ Note** : AutoScout24.se n'a pas de listings en Suède.

Pour avoir des **listings de vente** (comme Leboncoin pour la France), vous devez configurer un scraper pour l'une de ces plateformes suédoises :

### Option 1 : Blocket.se (Recommandé - Site de petites annonces suédois)

**URL** : `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`

**Status** : ⚠️ **Nécessite un scraper Apify personnalisé**

**Configuration requise** :
- Créer un acteur Apify pour Blocket.se
- Intégrer dans `autoScraperService.js`
- Ajouter le mapping de données dans `apifyService.js`

**Structure des URLs** :
- Recherche générale : `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`
- Par région : `https://www.blocket.se/annonser/[region]/fordon/bilar`
- Par marque : `https://www.blocket.se/annonser/hela_sverige/fordon/bilar?q=[marque]`

### Option 2 : Bilweb.se (Site spécialisé voitures)

**URL** : `https://www.bilweb.se/`

**Status** : ⚠️ **Nécessite un scraper Apify personnalisé**

**Note** : Bilweb est l'un des plus grands marchés de voitures en Suède, avec des véhicules de nombreux concessionnaires

### Option 3 : Bytbil.com (Site de voitures d'occasion)

**URL** : `https://www.bytbil.com/`

**Status** : ⚠️ **Nécessite un scraper Apify personnalisé**

**Note** : ~400,000 visiteurs uniques par mois, spécialisé dans les voitures d'occasion de concessionnaires

---

## 📊 Données Actuellement dans la Base

Pour vérifier quelles données suédoises vous avez déjà :

```sql
-- Vérifier les listings suédois
SELECT COUNT(*), source_platform 
FROM listings 
WHERE location_country = 'SE' 
GROUP BY source_platform;

-- Vérifier les enchères suédoises
SELECT COUNT(*), source 
FROM auction_listings 
WHERE source IN ('kvd', 'swedish_auction')
GROUP BY source;
```

---

## 🚀 Actions Recommandées

### Pour avoir des données de vente suédoises :

1. **Option Recommandée** : Blocket.se
   - **Créer un acteur Apify** pour Blocket.se (ou utiliser un acteur existant)
   - **Ajouter le support** dans `backend/src/services/autoScraperService.js`
   - **Configurer le mapping** de données dans `apifyService.js`
   - **Créer un scraper automatique** dans le Dashboard Admin avec :
     - Source : `blocket` (à ajouter)
     - URL : `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`

2. **Option Alternative** : Bilbasen.se ou Bilweb.se
   - Même processus que Blocket.se
   - Bilbasen est généralement plus spécialisé voitures

### Pour les enchères (déjà fonctionnel) :

- Utiliser le calculateur de marge : `#/auction-margin`
- Coller des URLs KVD
- Les données sont automatiquement parsées et stockées

---

## 🔍 Vérification des Données

Après configuration, vérifiez que les données arrivent :

```sql
-- Vérifier les nouvelles données suédoises
SELECT 
  location_country,
  source_platform,
  COUNT(*) as count,
  MAX(last_seen) as last_update
FROM listings
WHERE location_country = 'SE'
GROUP BY location_country, source_platform
ORDER BY last_update DESC;
```

---

## 📝 Notes Techniques

- Les données d'enchères (KVD) sont dans `auction_listings`
- Les données de vente doivent être dans `listings` avec `location_country = 'SE'`
- Les Market Insights utilisent uniquement les données de `listings` avec `status = 'sold'`
- Pour que les insights suédois fonctionnent, il faut des listings avec `status = 'sold'` et `location_country = 'SE'`

---

## ⚠️ Important

**Actuellement**, si vous n'avez que des données d'enchères (KVD), les Market Insights suédois seront **vides** car :
- Les enchères sont dans `auction_listings` (pas `listings`)
- Les Market Insights cherchent dans `listings` avec `status = 'sold'`

**Solution** : ✅ **IMPLÉMENTÉ** - Les scrapers pour **Blocket.se**, **Bilweb.se**, et **Bytbil.com** sont maintenant disponibles !

**Recommandation** : Commencer par **Blocket.se** car c'est la plateforme la plus visitée en Suède (~17M visites/mois).

## ✅ Implémentation Complétée

Les 3 services de scraping suédois ont été créés :
- ✅ `backend/src/services/blocketService.js` - Scraper Blocket.se
- ✅ `backend/src/services/bilwebService.js` - Scraper Bilweb.se  
- ✅ `backend/src/services/bytbilService.js` - Scraper Bytbil.com

**Intégration** : Les 3 sources sont intégrées dans `autoScraperService.js` et peuvent être utilisées via le Dashboard Admin.

### Comment Utiliser

1. **Aller dans le Dashboard Admin** : `#/admin`
2. **Créer un nouveau scraping automatique**
3. **Configuration pour Blocket.se** :
   - Nom : `Blocket.se - Suède`
   - Source : `blocket`
   - URLs : `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`
   - Fréquence : Toutes les 6 heures (`0 */6 * * *`)

4. **Configuration pour Bilweb.se** :
   - Nom : `Bilweb.se - Suède`
   - Source : `bilweb`
   - URLs : `https://www.bilweb.se/` (ajuster selon la structure du site)
   - Fréquence : Toutes les 6 heures

5. **Configuration pour Bytbil.com** :
   - Nom : `Bytbil.com - Suède`
   - Source : `bytbil`
   - URLs : `https://www.bytbil.com/` (ajuster selon la structure du site)
   - Fréquence : Toutes les 6 heures

**Note** : Les scrapers utilisent Puppeteer (comme Leboncoin) car il n'y a pas d'acteurs Apify disponibles pour ces plateformes.
