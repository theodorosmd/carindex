# 🎯 Stratégie de Scraping pour Carindex

> 📖 **Guide pratique** : Pour démarrer un scraping complet initial, consultez [GUIDE_SCRAPING_INITIAL.md](./GUIDE_SCRAPING_INITIAL.md)

## ❌ Pourquoi ne PAS tout scraper tous les jours ?

### Problèmes du scraping complet quotidien :
1. **Coût élevé** : Scraper 15M d'annonces chaque jour = coûts Apify énormes
2. **Redondance** : 95% des annonces sont identiques d'un jour à l'autre
3. **Temps de traitement** : Plusieurs heures pour tout scraper
4. **Ressources serveur** : Charge inutile sur la base de données

## ✅ Stratégies recommandées

### 1. **Scraping incrémental (RECOMMANDÉ)** ⭐

**Principe** : Ne scraper que les nouvelles annonces

**Comment ça marche** :
- Scraper seulement les premières pages (nouvelles annonces)
- Les sites trient généralement par date de publication (plus récentes en premier)
- Le système détecte automatiquement les doublons

**Avantages** :
- ✅ Coût réduit de 90-95%
- ✅ Temps de scraping divisé par 10-20
- ✅ Mise à jour rapide (nouvelles annonces en quelques minutes)
- ✅ Mise à jour des prix des annonces existantes

**Configuration recommandée** :
```
- Fréquence : Toutes les 6 heures
- Limite : 500-1000 annonces par URL (premières pages)
- Résultat : ~5000-10000 nouvelles annonces/jour
```

### 2. **Scraping complet hebdomadaire**

**Principe** : Scraper tout le catalogue une fois par semaine

**Quand l'utiliser** :
- Pour récupérer les annonces manquées
- Pour mettre à jour les annonces qui ont changé de catégorie
- Pour nettoyer les annonces supprimées

**Configuration recommandée** :
```
- Fréquence : 1x par semaine (dimanche matin)
- Limite : Sans limite (toutes les annonces)
- Résultat : Mise à jour complète du catalogue
```

### 3. **Scraping ciblé par marque/modèle**

**Principe** : Scraper seulement certaines marques/modèles populaires

**Quand l'utiliser** :
- Pour les marques très demandées (BMW, Mercedes, Audi, etc.)
- Pour les modèles spécifiques recherchés par vos clients
- Pour optimiser les coûts sur les segments rentables

**Configuration recommandée** :
```
- Fréquence : Toutes les 3-6 heures pour marques populaires
- Limite : Sans limite pour marques ciblées
- Résultat : Couverture complète des segments prioritaires
```

### 4. **Scraping à la demande**

**Principe** : Scraper seulement quand un utilisateur fait une recherche

**Quand l'utiliser** :
- Pour des recherches très spécifiques
- Pour compléter des données manquantes
- Pour des besoins ponctuels

**Configuration recommandée** :
```
- Déclenchement : Manuel via admin dashboard
- Limite : 100-500 annonces
- Résultat : Données fraîches pour recherche spécifique
```

## 📊 Recommandation pour Carindex V1

### Scraping incrémental quotidien (stratégie hybride)

**Configuration optimale** :

1. **Scraping incrémental toutes les 6 heures** (4x par jour)
   - AutoScout24 : 1000 annonces max par URL
   - mobile.de : 1000 annonces max par URL
   - LeBonCoin : 1000 annonces max par URL
   - **Coût estimé** : ~50-100€/mois
   - **Nouvelles annonces/jour** : ~5000-10000

2. **Scraping complet hebdomadaire** (1x par semaine)
   - Dimanche matin à 3h
   - Sans limite (toutes les annonces)
   - **Coût estimé** : ~200-300€/mois
   - **Résultat** : Catalogue complet à jour

3. **Scraping ciblé pour marques populaires** (optionnel)
   - BMW, Mercedes, Audi : Toutes les 3 heures
   - Autres marques premium : Toutes les 6 heures
   - **Coût estimé** : ~100-200€/mois

**Total estimé** : 350-600€/mois pour une couverture complète

## 🔄 Comment le système gère les doublons

Le système actuel :
1. ✅ **Détecte automatiquement les doublons** via `source_listing_id`
2. ✅ **Met à jour les annonces existantes** (prix, description, images)
3. ✅ **Enregistre l'historique des prix** si le prix change
4. ✅ **Marque comme "active"** les nouvelles annonces

**Résultat** : Même si vous scrapez les mêmes annonces, le système les met à jour intelligemment.

## 💡 Optimisations futures possibles

### 1. Détection intelligente des nouvelles annonces
- Utiliser l'API des sites pour récupérer seulement les IDs des nouvelles annonces
- Scraper seulement les annonces avec des IDs non présents en base

### 2. Scraping par segments
- Scraper par tranche de prix
- Scraper par région
- Scraping par type de véhicule

### 3. Priorisation des annonces
- Scraper en priorité les annonces avec beaucoup de vues
- Scraper en priorité les annonces récentes
- Ignorer les annonces très anciennes (>90 jours)

## 📈 Exemple de configuration pour 15M d'annonces

### Scénario réaliste :

**Jour 1** : Scraping complet initial
- Scrape toutes les annonces disponibles
- Coût : ~500-1000€ (une seule fois)
- Résultat : Base de données complète

**Jours suivants** : Scraping incrémental
- 4x par jour, 1000 annonces par URL
- Coût : ~50-100€/mois
- Résultat : ~5000-10000 nouvelles annonces/jour

**Chaque dimanche** : Scraping complet
- Sans limite, toutes les annonces
- Coût : ~200-300€/mois
- Résultat : Mise à jour complète hebdomadaire

**Total mensuel** : ~250-400€/mois après le scraping initial

## 🎯 Recommandation finale

**Pour Carindex V1, utilisez** :
1. ✅ **Scraping incrémental toutes les 6 heures** (par défaut)
2. ✅ **Scraping complet hebdomadaire** (dimanche matin)
3. ✅ **Option "Sans limite"** pour les marques prioritaires

**Ne scrapez pas tout tous les jours** - c'est inutile et coûteux !

