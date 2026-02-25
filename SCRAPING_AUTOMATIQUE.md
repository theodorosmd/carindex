# 🔄 Système de Scraping Automatique

## Vue d'ensemble

Le système de scraping automatique permet de configurer des scrapings qui s'exécutent automatiquement selon un planning défini (format Cron).

## Installation

### 1. Créer la table dans Supabase

Exécutez le SQL suivant dans le SQL Editor de Supabase :

```sql
-- Table pour stocker les configurations de scraping automatique
CREATE TABLE IF NOT EXISTS auto_scrapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin')),
  name VARCHAR(255) NOT NULL,
  search_urls TEXT[] NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20),
  last_run_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_scrapers_source ON auto_scrapers(source);
CREATE INDEX IF NOT EXISTS idx_auto_scrapers_enabled ON auto_scrapers(enabled) WHERE enabled = true;
```

### 2. Activer les scrapings automatiques

Assurez-vous que la variable d'environnement `ENABLE_AUTO_SCRAPERS` n'est pas définie à `false` dans `.env` :

```env
ENABLE_AUTO_SCRAPERS=true
```

## Utilisation depuis le Dashboard Admin

### Créer un scraping automatique

1. Allez sur le **Dashboard Admin** (`#/admin`)
2. Descendez jusqu'à la section **"Scrapings automatiques"**
3. Cliquez sur **"+ Nouveau scraping automatique"**
4. Remplissez le formulaire :
   - **Nom** : Un nom descriptif (ex: "AutoScout24 - Voitures d'occasion")
   - **Source** : AutoScout24, mobile.de ou LeBonCoin
   - **URLs de recherche** : Une URL par ligne (vous pouvez en mettre plusieurs pour scraper plusieurs recherches en une seule exécution)
   - **Planning** : Format Cron (ex: `0 */6 * * *` pour toutes les 6 heures)
   - **Activer** : Cochez pour activer immédiatement

### ⚡ Scraping automatique par incrémentation

**Bonne nouvelle !** Vous n'avez pas besoin de connaître toutes les URLs. Les scrapers Apify parcourent **automatiquement toutes les pages** d'une recherche !

**Comment ça marche :**
1. Vous donnez **une seule URL de recherche** (ex: `https://www.autoscout24.fr/lst?make=BMW`)
2. Le scraper parcourt **automatiquement toutes les pages** de cette recherche
3. Vous pouvez limiter le nombre d'annonces avec `max_results` (défaut: 1000)

**Exemple simple :**
```
URL: https://www.autoscout24.fr/lst?make=BMW
Max résultats: 1000
```
→ Le scraper va automatiquement parcourir toutes les pages jusqu'à trouver 1000 annonces BMW (ou jusqu'à la fin s'il y en a moins).

### Pourquoi plusieurs URLs alors ?

Vous pouvez mettre **plusieurs URLs** (une par ligne) pour :
- ✅ **Scraper plusieurs recherches différentes** : Par exemple, plusieurs marques (BMW, Mercedes, Audi) avec le même planning
- ✅ **Économiser les ressources** : Un seul job Cron au lieu de plusieurs
- ✅ **Organiser par thème** : Grouper des recherches similaires

**Exemple avec plusieurs URLs :**
```
https://www.autoscout24.fr/lst?make=BMW
https://www.autoscout24.fr/lst?make=MERCEDES
https://www.autoscout24.fr/lst?make=AUDI
```

Chaque URL sera scrapée avec toutes ses pages automatiquement.

### Formats Cron courants

- `0 */6 * * *` - Toutes les 6 heures
- `0 0 * * *` - Tous les jours à minuit
- `0 0 * * 0` - Tous les dimanches à minuit
- `0 0 1 * *` - Le 1er de chaque mois à minuit
- `0 0,12 * * *` - Tous les jours à midi et minuit

**Format :** `minute heure jour mois jour-semaine`

### Gérer les scrapings automatiques

- **Exécuter maintenant** : Cliquez sur "Exécuter" pour lancer un scraping immédiatement
- **Modifier** : Cliquez sur "Modifier" pour changer la configuration
- **Supprimer** : Cliquez sur "Supprimer" pour supprimer un scraping automatique
- **Activer/Désactiver** : Modifiez le scraping et cochez/décochez "Activer"

## API Endpoints

### GET /api/v1/admin/auto-scrapers
Liste tous les scrapings automatiques

### GET /api/v1/admin/auto-scrapers/:id
Récupère un scraping automatique par ID

### POST /api/v1/admin/auto-scrapers
Crée un nouveau scraping automatique

**Body:**
```json
{
  "source": "autoscout24",
  "name": "AutoScout24 - Voitures d'occasion",
  "search_urls": ["https://www.autoscout24.fr/lst?..."],
  "schedule_cron": "0 */6 * * *",
  "enabled": true
}
```

### PATCH /api/v1/admin/auto-scrapers/:id
Met à jour un scraping automatique

### DELETE /api/v1/admin/auto-scrapers/:id
Supprime un scraping automatique

### POST /api/v1/admin/auto-scrapers/:id/run
Exécute un scraping automatique immédiatement

## Fonctionnement technique

1. **Au démarrage du serveur** : Les scrapings automatiques activés sont chargés et planifiés
2. **Selon le planning Cron** : Chaque scraping s'exécute automatiquement
3. **Résultats** : Les résultats sont stockés dans `last_run_result` et `last_run_at` est mis à jour
4. **Rechargement** : Les configurations sont rechargées toutes les heures pour détecter les changements

## Monitoring

- Les logs du serveur indiquent quand un scraping automatique est exécuté
- Le dashboard admin affiche le statut de la dernière exécution
- Les erreurs sont enregistrées dans `last_run_result.error`

## Exemples de configuration

### AutoScout24 - Toutes les 6 heures
```json
{
  "source": "autoscout24",
  "name": "AutoScout24 - Voitures d'occasion",
  "search_urls": ["https://www.autoscout24.fr/lst?sort=standard&desc=0"],
  "schedule_cron": "0 */6 * * *",
  "enabled": true
}
```

### mobile.de - Tous les jours à minuit
```json
{
  "source": "mobile.de",
  "name": "mobile.de - Voitures neuves",
  "search_urls": ["https://www.mobile.de/fahrzeuge/search.html"],
  "schedule_cron": "0 0 * * *",
  "enabled": true
}
```

### LeBonCoin - Tous les dimanches
```json
{
  "source": "leboncoin",
  "name": "LeBonCoin - Voitures",
  "search_urls": ["https://www.leboncoin.fr/recherche?text=voiture"],
  "schedule_cron": "0 0 * * 0",
  "enabled": true
}
```

