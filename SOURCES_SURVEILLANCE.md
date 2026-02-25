# 📊 Sources Surveillées pour le Monitoring des Ventes

## Vue d'ensemble

Le système de **monitoring des ventes récentes** surveille **TOUTES** les annonces actives dans la base de données, peu importe leur source, à condition qu'elles soient en **France (FR)** ou **Suède (SE)**.

---

## ✅ Sources Disponibles et Configurées

### 🇫🇷 France

#### 1. **AutoScout24** (`autoscout24`)
- **URLs** : `https://www.autoscout24.fr/lst?cy=FR`
- **Status** : ✅ Implémenté (via Apify)
- **Configuration** : Via Dashboard Admin → Scrapings automatiques
- **Pays** : FR, DE, IT, ES, NL, BE, AT, CH

#### 2. **LeBonCoin** (`leboncoin`)
- **URLs** : `https://www.leboncoin.fr/recherche?category=2&text=voiture`
- **Status** : ✅ Implémenté (via Apify actor `3x1t~leboncoin-vehicle-scraper-ppe`)
- **Configuration** : Via Dashboard Admin → Scrapings automatiques
- **Pays** : FR uniquement

#### 3. **mobile.de** (`mobile.de`)
- **URLs** : `https://www.mobile.de/fahrzeuge/search.html`
- **Status** : ✅ Implémenté (via Apify)
- **Configuration** : Via Dashboard Admin → Scrapings automatiques
- **Pays** : DE, AT (mais peut être filtré pour FR si nécessaire)

---

### 🇸🇪 Suède

#### 4. **Blocket.se** (`blocket`)
- **URLs** : `https://www.blocket.se/annonser/hela_sverige/fordon/bilar`
- **Status** : ✅ Implémenté (via Puppeteer)
- **Configuration** : Via Dashboard Admin → Scrapings automatiques
- **Pays** : SE uniquement

#### 5. **Bilweb.se** (`bilweb`)
- **URLs** : `https://www.bilweb.se/`
- **Status** : ✅ Implémenté (via Puppeteer)
- **Configuration** : Via Dashboard Admin → Scrapings automatiques
- **Pays** : SE uniquement

#### 6. **Bytbil.com** (`bytbil`)
- **URLs** : `https://www.bytbil.com/`
- **Status** : ✅ Implémenté (via Puppeteer)
- **Configuration** : Via Dashboard Admin → Scrapings automatiques
- **Pays** : SE uniquement

---

## 🔍 Comment Vérifier les Sources Actives

### 1. Vérifier dans la Base de Données

```sql
-- Voir toutes les sources et leur nombre d'annonces actives
SELECT 
  source_platform,
  location_country,
  status,
  COUNT(*) as count,
  MAX(last_seen) as last_update
FROM listings
WHERE location_country IN ('FR', 'SE')
GROUP BY source_platform, location_country, status
ORDER BY location_country, source_platform, status;
```

### 2. Vérifier les Scrapers Configurés

```sql
-- Voir tous les scrapers automatiques configurés
SELECT 
  id,
  name,
  source,
  enabled,
  schedule_cron,
  last_run_at,
  last_run_status,
  last_run_result
FROM auto_scrapers
WHERE enabled = true
ORDER BY source, created_at;
```

### 3. Via le Dashboard Admin

1. Aller dans `#/admin`
2. Section **"Scrapings automatiques"**
3. Voir la liste des scrapers configurés et leur statut

---

## 📋 Sources Surveillées par le Job de Détection

Le job `salesDetectionJob.js` surveille **TOUTES** les annonces actives avec :
- `status = 'active'`
- `location_country IN ('FR', 'SE')`
- `last_seen < (now - 7 jours)` (non mises à jour depuis 7 jours)
- `first_seen < (now - 3 jours)` (existantes depuis au moins 3 jours)

**Peu importe la source** (`source_platform`), toutes les annonces actives sont surveillées.

---

## 🎯 Sources Actuellement Utilisées

Pour savoir quelles sources sont **réellement actives** dans votre base :

### Requête SQL

```sql
-- Voir les sources avec des annonces actives récentes (30 derniers jours)
SELECT 
  source_platform,
  location_country,
  COUNT(*) as active_listings,
  COUNT(CASE WHEN last_seen > NOW() - INTERVAL '7 days' THEN 1 END) as recently_updated,
  COUNT(CASE WHEN status = 'sold' AND sold_date > NOW() - INTERVAL '30 days' THEN 1 END) as recent_sales
FROM listings
WHERE location_country IN ('FR', 'SE')
GROUP BY source_platform, location_country
ORDER BY location_country, active_listings DESC;
```

---

## ⚙️ Configuration des Sources

### Pour Ajouter une Source

1. **Créer le service** (ex: `backend/src/services/[source]Service.js`)
2. **L'intégrer** dans `autoScraperService.js`
3. **Créer un scraper automatique** via Dashboard Admin

### Sources Prêtes à l'Emploi

- ✅ **AutoScout24** : Prêt (via Apify)
- ✅ **LeBonCoin** : Prêt (via Apify)
- ✅ **mobile.de** : Prêt (via Apify)
- ✅ **Blocket.se** : Prêt (via Puppeteer)
- ✅ **Bilweb.se** : Prêt (via Puppeteer)
- ✅ **Bytbil.com** : Prêt (via Puppeteer)

---

## 📊 Exemple de Résultat

Si vous avez configuré :
- AutoScout24 FR → annonces avec `source_platform = 'autoscout24'` et `location_country = 'FR'`
- LeBonCoin → annonces avec `source_platform = 'leboncoin'` et `location_country = 'FR'`
- Blocket.se → annonces avec `source_platform = 'blocket'` et `location_country = 'SE'`

**Toutes** ces annonces seront surveillées par le job de détection de ventes, et apparaîtront dans le monitoring des ventes récentes.

---

## 🔧 Pour Activer une Source

1. **Aller dans Dashboard Admin** : `#/admin`
2. **Section "Scrapings automatiques"**
3. **"+ Nouveau scraping automatique"**
4. **Choisir la source** dans le dropdown :
   - `autoscout24`
   - `leboncoin`
   - `mobile.de`
   - `blocket` (Suède)
   - `bilweb` (Suède)
   - `bytbil` (Suède)
5. **Configurer les URLs** et le planning
6. **Activer** le scraper

Une fois activé, les annonces de cette source seront automatiquement surveillées par le système de détection de ventes.
