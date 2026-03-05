# Configuration locale (scripts, check:growth)

Pour exécuter les scripts backend en local (ex. `npm run check:growth`), il faut un fichier `.env` qui pointe vers la même base Supabase que Railway.

## Étapes

### 1. Créer `backend/.env`

```bash
cd backend
cp .env.example .env
```

### 2. Copier les variables depuis Railway

1. Ouvre [Railway](https://railway.app) → projet **carindex** → onglet **Variables**
2. Copie ces deux valeurs :
   - `SUPABASE_URL` (ex. `https://xxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` (clé JWT longue)
3. Colle-les dans `backend/.env` :

```env
SUPABASE_URL=https://jgrebihiurfmuhfftsoa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...ta_clé_complète...
```

### 3. Vérifier

```bash
npm run check:growth
```

Tu devrais voir le total des listings (~396k) et les stats par source.
