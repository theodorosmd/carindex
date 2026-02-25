# 📊 Market Insights - Guide Complet des Fonctionnalités

## 🎯 Vue d'ensemble

Market Insights est un dashboard complet d'analyse de marché automobile qui permet de :
- Identifier les modèles qui se vendent le plus vite
- Analyser les tendances de prix et de vélocité
- Comparer des modèles côte à côte
- Calculer la rentabilité par modèle
- Recevoir des recommandations intelligentes
- Suivre des modèles dans une watchlist personnalisée

---

## ✅ Fonctionnalités Implémentées

### 🔥 Priorité Haute (Complété)

#### 1. Alertes sur Modèles Rapides
**Endpoint:** `POST /api/v1/analytics/alerts/fast-model`

**Types d'alertes disponibles:**
- `top10` : Alerte quand un modèle entre dans le top 10
- `velocity` : Alerte si vélocité dépasse un seuil (configurable)
- `dom_drop` : Alerte si le DOM moyen baisse significativement

**Utilisation:**
- Cliquez sur "🔔 Alerte" dans la table des modèles les plus vendus
- Sélectionnez le type d'alerte
- Configurez le seuil si nécessaire
- L'alerte sera créée et vous notifiera automatiquement

#### 2. Comparaison de Modèles
**Endpoint:** `POST /api/v1/analytics/compare-models`

**Fonctionnalités:**
- Compare 2 à 5 modèles simultanément
- Tableau comparatif avec toutes les métriques
- 3 graphiques Chart.js :
  - DOM Moyen (barres)
  - Prix Médian (barres)
  - Vélocité/mois (barres)

**Utilisation:**
- Cliquez sur "+ Comparer des modèles"
- Ajoutez 2-5 modèles (marque, modèle, année optionnelle)
- Visualisez la comparaison avec graphiques

#### 3. Tendances Temporelles
**Endpoint:** `GET /api/v1/analytics/trends`

**Fonctionnalités:**
- Analyse sur 6-12 mois
- Groupement par mois
- Calcul de direction des tendances :
  - DOM : up/down/stable avec variation en jours
  - Prix : up/down/stable avec variation en € et %
- 2 graphiques en ligne :
  - Évolution du DOM
  - Évolution du prix

**Utilisation:**
- Entrez marque, modèle, année (optionnel)
- Sélectionnez la période (6 ou 12 mois)
- Visualisez les tendances avec indicateurs de direction

#### 4. Analyse de Rentabilité
**Endpoint:** `GET /api/v1/analytics/profitability`

**Métriques calculées:**
- Profit moyen (prix vente - prix achat)
- ROI moyen (%)
- Marge moyenne (%)
- Profit par jour (profit / DOM)
- Total profit/revenue/cost

**Filtres:**
- Pays
- Période (30/90/180 jours)
- Nombre minimum de ventes (défaut: 5)

**Utilisation:**
- Sélectionnez pays et période
- Consultez le tableau trié par ROI décroissant
- Identifiez les modèles les plus rentables

---

### 🟡 Priorité Moyenne (Complété)

#### 5. Recommandations Intelligentes
**Endpoint:** `GET /api/v1/analytics/recommendations`

**Types de recommandations:**
- **Sous-évalués** : Modèles avec DOM élevé + baisse de prix significative
- **En progression** : Modèles entrant dans le top 10 ou améliorant leur rang
- **Opportunités** : Baisse de prix récente + DOM élevé

**Score de potentiel:**
- Calculé automatiquement basé sur baisse de prix et DOM
- Score 0-100 (plus haut = meilleure opportunité)

**Utilisation:**
- Section "💡 Recommandations Intelligentes"
- Filtrez par type ou consultez toutes
- Ajoutez à la watchlist ou créez une alerte directement

#### 6. Analyse de Concurrence
**Endpoint:** `GET /api/v1/analytics/competition`

**Métriques:**
- Nombre d'annonces actives (concurrents)
- Nombre de ventes récentes (90 jours)
- Taux de saturation du marché (%)
- Niveau de rareté :
  - 🔥 Pénurie (faible offre, forte demande)
  - ⚠️ Surplus (forte offre, faible demande)
  - 📉 Offre limitée
  - 📊 Normal
- DOM moyen (actifs vs vendus)
- Taux de conversion
- Gamme de prix (min/max/médian/moyenne)

**Utilisation:**
- Entrez marque, modèle, année (optionnel)
- Analysez la concurrence et identifiez les opportunités

#### 7. Watchlist & Suivi Personnalisé
**Endpoints:**
- `POST /api/v1/analytics/watchlist` - Ajouter un modèle
- `GET /api/v1/analytics/watchlist` - Liste des modèles suivis
- `DELETE /api/v1/analytics/watchlist/:id` - Retirer un modèle
- `GET /api/v1/analytics/watchlist/:id/history` - Historique des changements

**Fonctionnalités:**
- Ajoutez des modèles à suivre
- Notes personnalisées par modèle
- Statistiques en temps réel (rang, DOM, vélocité, prix)
- Historique des changements de métriques
- Notifications automatiques (à venir)

**Utilisation:**
- Cliquez sur "+ Ajouter un modèle" ou "⭐ Ajouter" depuis les recommandations
- Consultez votre watchlist avec stats en temps réel
- Visualisez l'historique pour chaque modèle

---

### 🟢 Priorité Basse (Partiellement Complété)

#### 8. Prédictions ML (Heuristiques)
**Endpoint:** `GET /api/v1/analytics/predictions`

**Prédictions:**
- **Temps de vente** : Basé sur DOM actuel vs DOM moyen historique
- **Prix futur** : Basé sur tendances des 6 derniers mois
- **Score d'affaire** : 0-100 basé sur :
  - Écart avec prix marché
  - DOM actuel vs DOM moyen
  - Motivation du vendeur

**Niveaux de score:**
- 80-100 : Excellente affaire !
- 65-79 : Bonne affaire
- 50-64 : Prix correct
- 0-49 : Prix élevé

**Utilisation:**
- Section "🔮 Prédictions & Score d'Affaire"
- Entrez marque, modèle, prix actuel, DOM actuel
- Obtenez prédictions et score

#### 9. Export PDF
**Endpoint:** `GET /api/v1/analytics/export-pdf`

**Note:** Retourne JSON structuré pour génération PDF côté frontend (jsPDF recommandé)

---

## 📋 Migration Requise

Avant d'utiliser toutes les fonctionnalités, exécutez la migration 012 dans Supabase :

**Fichier:** `backend/src/database/migrations/012_add_watchlist_and_analytics.sql`

**Étapes:**
1. Ouvrez Supabase SQL Editor : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/sql/new
2. Copiez le contenu de `012_add_watchlist_and_analytics.sql`
3. Collez et exécutez dans Supabase
4. Vérifiez le succès : "Success. No rows returned"

---

## 🎨 Interface Utilisateur

### Sections de Market Insights

1. **💡 Recommandations Intelligentes** (en haut)
   - Suggestions automatiques
   - Filtres par type
   - Actions rapides (watchlist, alerte)

2. **📊 Analyse de Concurrence**
   - Recherche par marque/modèle
   - Métriques de marché
   - Indicateurs de rareté

3. **⭐ Ma Watchlist**
   - Modèles suivis
   - Stats en temps réel
   - Historique par modèle

4. **⚡ Modèles qui se Vendent le Plus Vite**
   - Table avec filtres (période, pays, année, marque)
   - Colonne pays
   - Boutons d'action (alerte)

5. **📈 Statistiques par Pays**
   - Graphiques comparatifs
   - Tableau détaillé
   - Filtre par période

6. **🔄 Comparaison de Modèles**
   - Modal de sélection
   - Tableau et graphiques

7. **📉 Tendances Temporelles**
   - Recherche par modèle
   - Graphiques d'évolution
   - Indicateurs de direction

8. **💰 Analyse de Rentabilité**
   - Tableau avec ROI
   - Filtres pays/période

9. **🔮 Prédictions & Score d'Affaire**
   - Calculateur de prédictions
   - Score d'affaire visuel

10. **🔥 Hot Deals**
    - Annonces sous-évaluées
    - Export CSV

---

## 🔗 Endpoints API Disponibles

### Analytics
- `GET /api/v1/analytics/filter-options` - Options de filtres
- `GET /api/v1/analytics/fastest-selling-models` - Modèles les plus rapides
- `GET /api/v1/analytics/stats-by-country` - Stats par pays
- `GET /api/v1/analytics/export` - Export CSV/JSON
- `POST /api/v1/analytics/compare-models` - Comparer modèles
- `GET /api/v1/analytics/trends` - Tendances temporelles
- `GET /api/v1/analytics/profitability` - Analyse rentabilité
- `GET /api/v1/analytics/recommendations` - Recommandations
- `GET /api/v1/analytics/competition` - Analyse concurrence
- `GET /api/v1/analytics/predictions` - Prédictions ML
- `GET /api/v1/analytics/export-pdf` - Export PDF (JSON)
- `POST /api/v1/analytics/alerts/fast-model` - Créer alerte

### Watchlist
- `POST /api/v1/analytics/watchlist` - Ajouter modèle
- `GET /api/v1/analytics/watchlist` - Liste watchlist
- `DELETE /api/v1/analytics/watchlist/:id` - Retirer modèle
- `GET /api/v1/analytics/watchlist/:id/history` - Historique

---

## 🚀 Prochaines Étapes (Optionnel)

### Fonctionnalités Restantes (Priorité Basse)

1. **Partage de Graphiques**
   - Générer liens publics pour graphiques
   - Embed codes pour sites externes

2. **Export PDF Avancé**
   - Intégration jsPDF ou puppeteer
   - Templates de rapports

3. **Intégrations**
   - Webhooks pour automatisation
   - Export Google Sheets
   - API publique documentée

4. **Analyse Géographique Avancée**
   - Carte interactive
   - Hotspots de ventes
   - Migration géographique

---

## 📝 Notes Techniques

- **Base de données:** Supabase (PostgreSQL)
- **Graphiques:** Chart.js 4.4.0
- **Export CSV:** BOM UTF-8 pour compatibilité Excel
- **Authentification:** JWT Bearer token
- **Rate limiting:** Activé sur toutes les routes

---

## ✅ Checklist d'Activation

- [ ] Migration 011 appliquée (price history)
- [ ] Migration 012 appliquée (watchlist)
- [ ] Serveur backend redémarré
- [ ] Test des endpoints API
- [ ] Vérification des graphiques Chart.js
- [ ] Test de création d'alertes
- [ ] Test de watchlist

---

**Toutes les fonctionnalités de priorité haute et moyenne sont implémentées et prêtes à l'emploi !** 🎉
