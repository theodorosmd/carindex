# 🚀 Démarrer Carindex Localement

## ✅ Serveurs Démarrés

Les serveurs backend et frontend sont en cours de démarrage.

## 🌐 URLs d'Accès

### Frontend (Interface Utilisateur)
**URL** : http://localhost:5173

- **Landing Page** : http://localhost:5173/
- **Page de Recherche** : http://localhost:5173/#/search

### Backend (API)
**URL** : http://localhost:3001

- **Health Check** : http://localhost:3001/health
- **API Listings** : http://localhost:3001/api/v1/listings
- **API Scraper** : http://localhost:3001/api/v1/scraper/run

## 📋 Commandes pour Démarrer Manuellement

Si les serveurs ne sont pas déjà démarrés :

### Backend
```bash
cd backend
npm run dev
```

### Frontend (dans un autre terminal)
```bash
cd frontend
npm run dev
```

## 🧪 Tester l'Application

### 1. Ouvrir le Frontend
Ouvrez votre navigateur et allez sur : **http://localhost:5173**

### 2. Tester la Landing Page
- Vous devriez voir la page d'accueil Carindex
- Cliquez sur "Rechercher" pour aller à la page de recherche

### 3. Tester la Recherche
- Allez sur : http://localhost:5173/#/search
- Les listings scrapés (10 listings) devraient apparaître
- Testez les filtres de recherche

### 4. Tester l'API Backend
```bash
# Health check
curl http://localhost:3001/health

# Récupérer les listings
curl http://localhost:3001/api/v1/listings?limit=5
```

## 🔧 Configuration

### Variables d'Environnement

**Backend** (`backend/.env`) :
- `PORT=3001`
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `APIFY_API_TOKEN` ✅
- `FRONTEND_URL=http://localhost:5173`

**Frontend** (`frontend/.env` ou `vite.config.js`) :
- L'URL de l'API backend est configurée dans le code frontend

## 📊 Données Disponibles

Après le test du scraper, vous avez **10 listings** dans Supabase qui devraient être visibles dans l'interface de recherche.

## 🐛 Dépannage

### Le frontend ne se charge pas
- Vérifiez que Vite est démarré : `cd frontend && npm run dev`
- Vérifiez le port 5173 n'est pas utilisé

### Le backend ne répond pas
- Vérifiez que le serveur est démarré : `cd backend && npm run dev`
- Vérifiez le port 3001 n'est pas utilisé
- Vérifiez les variables d'environnement dans `backend/.env`

### Pas de données dans la recherche
- Vérifiez que les listings sont dans Supabase
- Vérifiez la connexion Supabase : `node backend/src/scripts/test-supabase-api.js`
- Vérifiez les logs du backend pour les erreurs

## 🎯 Prochaines Étapes

1. ✅ **Application lancée localement**
2. ⏭️ **Tester la recherche avec les 10 listings**
3. ⏭️ **Tester les filtres**
4. ⏭️ **Scraper plus de données** pour avoir plus de résultats
5. ⏭️ **Tester toutes les fonctionnalités**







