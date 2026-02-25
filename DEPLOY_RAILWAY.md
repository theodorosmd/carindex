# Déploiement du backend Carindex sur Railway

Ce guide permet de déployer le backend Node.js sur Railway pour que le frontend Vercel puisse l’appeler en production.

## Prérequis

- Compte [Railway](https://railway.app)
- Repo GitHub : https://github.com/theodorosmd/carindex
- Accès aux variables Supabase (URL, clé service role)

---

## Étape 1 : Créer le projet Railway

1. Allez sur [railway.app](https://railway.app) et connectez-vous (ou créez un compte).
2. Cliquez sur **New Project**.
3. Choisissez **Deploy from GitHub repo**.
4. Sélectionnez le repo `theodorosmd/carindex`.
5. Railway va détecter le monorepo. Il faut configurer un seul service pour le backend.

---

## Étape 2 : Configurer le service backend (OBLIGATOIRE)

1. Dans le projet Railway, cliquez sur le service **carindex**.
2. Allez dans l’onglet **Settings**.
3. **Root Directory** : définissez `backend` (sans slash).
   - ⚠️ **C’est la cause la plus fréquente d’échec de build** : sans ça, Railway utilise le `package.json` racine (frontend) au lieu du backend.
   - Railway ne déploiera que le contenu du dossier `backend/`.
4. **Build Command** : laisser vide ou `npm install` (Nixpacks le gère automatiquement).
5. **Start Command** : `node src/server.js` (déjà défini dans `railway.json`).
6. Railway fournira automatiquement `PORT` ; le code l’utilise déjà.

---

## Étape 3 : Variables d’environnement

Dans **Variables** (onglet du service), ajoutez :

| Variable | Valeur | Obligatoire |
|----------|--------|-------------|
| `SUPABASE_URL` | `https://xxx.supabase.co` (Supabase → Settings → API) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé "service_role" (Supabase → Settings → API) | ✅ |
| `FRONTEND_URL` | `https://carindex-delta.vercel.app` | ✅ (CORS) |
| `JWT_SECRET` | Chaîne aléatoire sécurisée (ex : `openssl rand -base64 32`) | ✅ |

Variables optionnelles (selon l’usage) :

- `DATABASE_URL` : si des scripts utilisent une connexion PostgreSQL directe.
- `ENABLE_CRON_JOBS` : **mettez `false`** au premier déploiement pour éviter les crashs (les crons appellent Supabase immédiatement).
- `INGEST_API_KEY` : si vous utilisez l’ingest public.

---

## Étape 4 : Déployer et obtenir l’URL publique

1. Railway lance le déploiement automatiquement après la configuration.
2. Une fois le build terminé, allez dans **Settings** → **Networking** → **Generate Domain**.
3. Copiez l’URL publique, par ex. :  
   `https://carindex-backend-production-xxxx.up.railway.app`

---

## Étape 5 : Mettre à jour Vercel (proxy API)

1. Ouvrez `vercel.json` à la racine du projet.
2. Remplacez `YOUR_RAILWAY_URL` par votre URL Railway **sans** `https://` :

```json
"destination": "https://carindex-backend-production-xxxx.up.railway.app/api/:path*"
```

Exemple complet :

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://votre-projet.up.railway.app/api/:path*"
    },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

3. Poussez les changements sur GitHub ; Vercel redéploiera le frontend.
4. Ou redéployez manuellement depuis le dashboard Vercel.

---

## Étape 6 : Vérification

1. **Health check** :
   ```bash
   curl https://votre-projet.up.railway.app/api/v1/health
   ```
   Réponse attendue : `{"status":"ok"}`

2. **Via le frontend** :  
   Ouvrez https://carindex-delta.vercel.app et vérifiez que les annonces et l’API chargent correctement.

---

## Résumé des fichiers modifiés

- `backend/railway.json` : configuration Railway (start command).
- `backend/.env.example` : variables `FRONTEND_URL` et `JWT_SECRET`.
- `vercel.json` : rewrite `/api/*` → backend Railway.
- Le backend utilise déjà `process.env.PORT` (fourni par Railway).

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Erreur CORS | Vérifier que `FRONTEND_URL` correspond exactement à l’URL Vercel. |
| 502 / Backend unreachable | Vérifier les variables d’environnement et les logs Railway. |
| 503 / DB error | Vérifier `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. |
| Annonces vides | Vérifier que le rewrite Vercel pointe vers la bonne URL Railway. |
