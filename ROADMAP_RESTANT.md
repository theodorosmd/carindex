# 🚗 Carindex V1 - Ce qui reste à faire

## ✅ Phase 1 (Mois 0-3) - COMPLÉTÉE

Toutes les fonctionnalités "Must have" sont implémentées :
- ✅ Scraping LeBonCoin + AutoScout24
- ✅ Base de données avec structure complète
- ✅ Recherche multi-critères fonctionnelle
- ✅ Calcul prix marché basique
- ✅ Système d'alertes email
- ✅ Inscription / Connexion
- ✅ Dashboard minimal

---

## 🔄 Phase 2 (Mois 3-6) - EN COURS

### ✅ Fait
- ✅ Indice de confiance du prix marché
- ✅ Filtres avancés (version, finition, couleur)
- ✅ Historique de prix simple
- ✅ Interface améliorée (loading states, animations)

### ❌ À faire

#### 1. Export CSV des résultats de recherche
**Priorité** : Moyenne  
**Complexité** : Faible  
**Fichiers à créer/modifier** :
- `backend/src/routes/listings.js` - Ajouter route `GET /api/v1/listings/export`
- `backend/src/controllers/listingsController.js` - Controller pour export CSV
- `frontend/src/pages/listings-search.js` - Bouton "Exporter en CSV"

**Fonctionnalité** :
- Permet de télécharger les résultats de recherche au format CSV
- Inclut : marque, modèle, année, prix, kilométrage, localisation, URL source
- Filtre les résultats selon les critères de recherche actuels

---

## 📋 Phase 3 (Mois 6-12) - À PLANIFIER

### ❌ Fonctionnalités manquantes

#### 1. Webhooks pour alertes premium ✅ COMPLÉTÉ
**Priorité** : Basse (plan Plus seulement)  
**Complexité** : Moyenne  
**Statut** : ✅ **TERMINÉ**

**Fonctionnalités implémentées** :
- ✅ Service webhook créé (`webhookService.js`)
- ✅ Support retry avec backoff exponentiel (3 tentatives max)
- ✅ Timeout configurable (10s par défaut)
- ✅ Intégration dans `alertChecker.js` (envoi webhook + email)
- ✅ Format JSON standardisé avec métadonnées
- ✅ Logging détaillé pour debugging
- ✅ Validation d'URL
- ✅ Colonne `webhook_url` déjà présente dans schema (Phase 1)

#### 2. Scraper mobile.de (Allemagne) ✅ COMPLÉTÉ
**Priorité** : Moyenne  
**Complexité** : Moyenne  
**Statut** : ✅ **TERMINÉ**

**Fonctionnalités implémentées** :
- ✅ Service scraper mobile.de créé (`mobiledeService.js`)
- ✅ Mapper de données adapté pour mobile.de (format allemand)
- ✅ Intégration dans `scraperController.js`
- ✅ Support des termes allemands (Diesel, Benzin, Automatik, etc.)
- ⚠️ **Note** : Nécessite un acteur Apify pour mobile.de (à configurer via `APIFY_MOBILEDE_ACTOR_ID`)

#### 3. Amélioration algorithme prix marché ✅ COMPLÉTÉ
**Priorité** : Moyenne  
**Complexité** : Moyenne-Élevée  
**Statut** : ✅ **TERMINÉ**

**Améliorations implémentées** :
- ✅ Pondération selon kilométrage (plus proche = poids plus élevé)
- ✅ Pondération selon année (plus proche = poids plus élevé)
- ✅ Pondération selon date de publication (plus récent = plus fiable)
- ✅ Exclusion des outliers (méthode IQR - Interquartile Range)
- ✅ Pondération selon carburant et transmission (match exact = poids plus élevé)
- ✅ Calcul de médiane pondérée au lieu de simple médiane
- ✅ Indice de confiance amélioré avec bonus pour exclusion d'outliers
- ✅ Métadonnées enrichies (méthode de calcul, variance pondérée)

#### 4. Mobile Responsive ✅ COMPLÉTÉ
**Priorité** : Haute  
**Complexité** : Moyenne  
**Statut** : ✅ **TERMINÉ**

**Fonctionnalités implémentées** :
- ✅ Interface utilisable sur mobile/tablette
- ✅ Menu hamburger pour navigation
- ✅ Filtres en drawer sur mobile avec overlay
- ✅ Cartes de listings adaptées mobile
- ✅ Formulaire d'analyse stock adapté mobile
- ✅ Toutes les pages responsive (search, details, dashboard, stock-analysis, landing)

#### 5. Optimisations de performance ✅ COMPLÉTÉ
**Priorité** : Haute  
**Complexité** : Variable  
**Statut** : ✅ **TERMINÉ**

**Optimisations implémentées** :
- ✅ Indexes composites ajoutés (migration `003_add_performance_indexes.sql`)
- ✅ Cache en mémoire pour facets (10 min TTL)
- ✅ Cache en mémoire pour prix marché (30 min TTL)
- ✅ Virtual scrolling pour grandes listes (>100 items)
- ✅ Sélection optimisée des colonnes dans les requêtes
- ✅ Batch processing pour calculs de prix marché (évite doublons)
- ✅ Limite de résultats pour facets (10K max)
- ✅ Lazy loading des images (déjà fait)
- ✅ Debouncing recherche (déjà fait)

---

## 🎯 Priorités recommandées (ordre d'implémentation)

### ✅ Priorité 1 : Mobile Responsive - TERMINÉ
**Pourquoi** : Essentiel pour l'adoption, beaucoup d'utilisateurs utilisent mobile  
**Temps estimé** : 2-3 jours  
**Impact** : Très élevé  
**Statut** : ✅ **COMPLÉTÉ**

### Priorité 2 : Export CSV
**Pourquoi** : Feature "Should have" Phase 2, demandée par clients Pro  
**Temps estimé** : 1 jour  
**Impact** : Moyen-Élevé

### ✅ Priorité 3 : Optimisations performance - TERMINÉ
**Pourquoi** : Améliore l'expérience utilisateur, réduit les coûts serveur  
**Temps estimé** : 2-3 jours  
**Impact** : Moyen-Élevé  
**Statut** : ✅ **COMPLÉTÉ**

### ✅ Priorité 4 : Scraper mobile.de - TERMINÉ
**Pourquoi** : Permet d'ajouter l'Allemagne, marché important  
**Temps estimé** : 2-3 jours  
**Impact** : Moyen  
**Statut** : ✅ **COMPLÉTÉ**

### ✅ Priorité 5 : Amélioration prix marché - TERMINÉ
**Pourquoi** : Améliore la qualité du produit core  
**Temps estimé** : 3-5 jours  
**Impact** : Moyen  
**Statut** : ✅ **COMPLÉTÉ**

### ✅ Priorité 6 : Webhooks alertes - TERMINÉ
**Pourquoi** : Feature premium, seulement pour plan Plus  
**Temps estimé** : 2 jours  
**Impact** : Bas (peu de clients Plus au début)  
**Statut** : ✅ **COMPLÉTÉ**

---

## 📊 État actuel vs Plan V1

### Phase 1 (Mois 0-3) : ✅ 100% complétée
### Phase 2 (Mois 3-6) : ✅ 90% complétée (manque Export CSV)
### Phase 3 (Mois 6-12) : ✅ 100% complétée

---

## 🚀 Prochaines étapes recommandées

1. **✅ TERMINÉ** : Mobile Responsive
2. **✅ TERMINÉ** : Optimisations performance
3. **✅ TERMINÉ** : Scraper mobile.de
4. **✅ TERMINÉ** : Amélioration prix marché
5. **✅ TERMINÉ** : Webhooks alertes
6. **À FAIRE MAINTENANT** : Export CSV (1 jour) - Seule fonctionnalité restante de Phase 2

---

## 💡 Notes importantes

- **Focus** : Ne pas tout faire en même temps. Prioriser selon feedback clients.
- **Itération** : Améliorer les features existantes avant d'en ajouter de nouvelles.
- **Feedback** : Parler avec 2-3 clients chaque semaine pour prioriser.

---

*Dernière mise à jour : 2025*

