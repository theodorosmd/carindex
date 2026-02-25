# Exécuter la migration 020+021 (obligatoire pour le flux mobile.de)

## Problème actuel

- `npm run migrate:020` échoue : `getaddrinfo ENOTFOUND db.jgrebihiurfmuhfftsoa.supabase.co`
- La table `mobile_de_fetch_queue` n'existe pas → le flux ajoute 0 URLs à la queue

## Solution : exécuter le SQL manuellement

### Option 1 : Supabase SQL Editor (recommandé)

1. Ouvrez : **https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/sql/new**
2. Connectez-vous si demandé
3. Copiez tout le contenu de `migration-020-021.sql` (ou exécutez `npm run migrate:020:sql` pour l’affichage)
4. Collez dans l’éditeur puis cliquez **Run**
5. Vérifiez que la requête s’exécute sans erreur

### Option 2 : via API (si vous avez un Personal Access Token)

1. Créez un token : https://supabase.com/dashboard/account/tokens
2. Exécutez :
   ```bash
   cd backend
   SUPABASE_ACCESS_TOKEN=sbp_votre_token npm run migrate:020:api
   ```

## Après la migration

Relancez le flux :

```bash
cd /Users/theodoredignet/Downloads/mobile
source .venv/bin/activate
INGEST_API_KEY=carindex-ingest-dev-key INGEST_API_URL=http://localhost:3001 ./run_standalone.sh
```

Assurez-vous que le backend Carindex tourne sur le port 3001 (`npm run dev` dans `backend/`).
