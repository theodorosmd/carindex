# 🚨 ACTION REQUISE : Exécuter la Migration 011 - Historique des Prix

## ⚠️ Migration nécessaire pour l'historique des prix et détection des baisses

## 📋 Instructions étape par étape

### Étape 1 : Ouvrir Supabase SQL Editor
1. Cliquez sur ce lien : **https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/sql/new**
2. Ou allez sur https://supabase.com/dashboard → Sélectionnez votre projet → SQL Editor → New query

### Étape 2 : Copier le SQL
1. Ouvrez le fichier : `backend/src/database/migrations/011_price_history_enhanced.sql`
2. Sélectionnez TOUT le contenu (Cmd+A / Ctrl+A)
3. Copiez (Cmd+C / Ctrl+C)

### Étape 3 : Coller et exécuter
1. Collez le SQL dans l'éditeur Supabase (Cmd+V / Ctrl+V)
2. Cliquez sur le bouton **"Run"** (en haut à droite)
3. Ou appuyez sur **Cmd+Enter** (Mac) / **Ctrl+Enter** (Windows/Linux)

### Étape 4 : Vérifier le succès
Vous devriez voir un message : **"Success. No rows returned"**

### Étape 5 : Vérifier que les colonnes existent
Exécutez cette requête dans le SQL Editor pour vérifier :

```sql
-- Vérifier les colonnes ajoutées à listings
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'listings'
  AND column_name IN ('first_seen', 'sold_date', 'dom_days', 'price_drop_amount', 'price_drop_pct', 'last_price_drop_date')
ORDER BY column_name;

-- Vérifier les colonnes ajoutées à price_history
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'price_history'
  AND column_name IN ('drop_amount', 'drop_pct', 'previous_price')
ORDER BY column_name;

-- Vérifier les index créés
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%price%' OR indexname LIKE 'idx_%first_seen%' OR indexname LIKE 'idx_%sold%'
ORDER BY indexname;
```

Vous devriez voir :
- **6 colonnes** dans `listings`
- **3 colonnes** dans `price_history`
- **5 index** créés

### Étape 6 : Redémarrer et tester
1. Redémarrez le serveur backend (arrêtez avec Ctrl+C et relancez `npm run dev`)
2. Testez l'historique des prix sur une annonce
3. Vérifiez que les baisses de prix sont détectées

## 🔗 Lien direct
**https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/sql/new**

## 📁 Fichier SQL à copier
`backend/src/database/migrations/011_price_history_enhanced.sql`

## ✅ Ce que cette migration ajoute

### Table `listings` :
- `first_seen` : Date de première apparition de l'annonce
- `sold_date` : Date de vente (quand l'annonce disparaît)
- `dom_days` : Days On Market (jours sur le marché)
- `price_drop_amount` : Montant de la dernière baisse de prix
- `price_drop_pct` : Pourcentage de la dernière baisse de prix
- `last_price_drop_date` : Date de la dernière baisse de prix

### Table `price_history` :
- `drop_amount` : Montant de la baisse (si baisse)
- `drop_pct` : Pourcentage de la baisse (si baisse)
- `previous_price` : Prix précédent (pour comparaison)

### Index créés :
- `idx_listings_first_seen` : Pour les requêtes par date d'apparition
- `idx_listings_status_sold` : Pour les requêtes de ventes
- `idx_listings_price_drop` : Pour les requêtes de baisses de prix
- `idx_price_history_drops` : Pour les requêtes de baisses dans l'historique
- `idx_price_history_recent` : Pour les requêtes récentes d'historique

---

**Note** : Si vous avez déjà exécuté la migration mais voyez toujours des erreurs, essayez de redémarrer le serveur backend car Supabase peut mettre quelques secondes à mettre à jour le cache du schéma.
