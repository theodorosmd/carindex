# Brancher le frontend local sur l'API VPS

Pour faire tourner le frontend en local (Mac) tout en utilisant l'API du VPS.

## 1. Sur le VPS : autoriser localhost (CORS)

Sur le VPS, ajoutez dans `backend/.env` :

```bash
# Autoriser le frontend local (pour dev)
ALLOWED_ORIGINS=http://localhost:3000,https://carindex.com,https://carindex-delta.vercel.app
```

Puis redémarrez :

```bash
pm2 restart carindex-scraper
```

## 2. Sur le Mac : lancer le frontend pointant vers le VPS

### Option A : une commande

```bash
npm run dev:vps
```

### Option B : fichier .env.local

```bash
cd frontend
cp .env.vps.example .env.local
npm run dev
```

Le frontend (http://localhost:3000) enverra toutes les requêtes `/api` vers http://91.99.61.232:3000.

## Revenir au backend local

Supprimez `frontend/.env.local` ou utilisez `npm run dev` (avec backend local).
