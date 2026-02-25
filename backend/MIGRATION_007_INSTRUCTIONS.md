# Migration 007: Auction Margin Calculator Tables

## Problème
L'erreur `Could not find the table 'public.auction_listings' in the schema cache` indique que les tables nécessaires pour le calculateur de marge n'existent pas encore dans la base de données.

## Solution

### Option 1: Via Supabase Dashboard (Recommandé)

1. Allez sur votre dashboard Supabase : https://app.supabase.com
2. Sélectionnez votre projet
3. Ouvrez l'éditeur SQL (SQL Editor dans le menu de gauche)
4. Créez une nouvelle requête
5. Copiez-collez le contenu du fichier `backend/src/database/migrations/007_add_auction_margin_tables.sql`
6. Exécutez la requête (bouton "Run" ou Cmd/Ctrl + Enter)

### Option 2: Via psql (si vous avez accès direct)

```bash
# Si vous avez DATABASE_URL dans votre .env
cd backend
psql $DATABASE_URL -f src/database/migrations/007_add_auction_margin_tables.sql
```

### Vérification

Après avoir exécuté la migration, vérifiez que les tables existent :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('auction_listings', 'comparable_listings', 'margin_calculations')
ORDER BY table_name;
```

Vous devriez voir les 3 tables listées.

## Tables créées

- `auction_listings` : Stocke les annonces d'enchères (KVD, etc.)
- `comparable_listings` : Stocke les annonces comparables de Leboncoin
- `margin_calculations` : Stocke les calculs de marge effectués

## Après la migration

Une fois la migration exécutée, le calculateur de marge devrait fonctionner correctement. Rechargez la page et réessayez de calculer une marge.
