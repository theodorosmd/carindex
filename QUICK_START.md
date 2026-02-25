# 🚀 Démarrage Rapide - Carindex

## ✅ Application Lancée !

### 🌐 Accès à l'Application

**Frontend (Interface)** : 
- **http://localhost:5173** ou **http://localhost:3000**

**Backend (API)** :
- **http://localhost:3001**

## 📱 Pages Disponibles

1. **Landing Page** : http://localhost:5173/
   - Page d'accueil marketing Carindex

2. **Recherche de Listings** : http://localhost:5173/#/search
   - Recherche et filtres de véhicules
   - 10 listings disponibles (scrapés depuis AutoScout24)

## 🧪 Tester l'Application

### 1. Ouvrir dans le Navigateur
Ouvrez votre navigateur et allez sur :
```
http://localhost:5173
```

### 2. Naviguer vers la Recherche
- Cliquez sur "Rechercher" dans le menu
- Ou allez directement sur : http://localhost:5173/#/search

### 3. Tester les Filtres
- Utilisez la barre de recherche
- Testez les filtres (marque, modèle, prix, etc.)
- Les 10 listings scrapés devraient apparaître

### 4. Tester l'API Backend
```bash
# Health check
curl http://localhost:3001/health

# Récupérer les listings
curl http://localhost:3001/api/v1/listings?limit=5
```

## 🔧 Si les Serveurs ne Sont Pas Démarrés

### Démarrer le Backend
```bash
cd backend
npm run dev
```

### Démarrer le Frontend (dans un autre terminal)
```bash
cd frontend
npm run dev
```

## 📊 Données Disponibles

- ✅ **10 listings** dans Supabase (scrapés depuis AutoScout24)
- ✅ **API fonctionnelle** avec Supabase REST
- ✅ **Scraper Apify** configuré et testé

## 🎯 Fonctionnalités à Tester

1. ✅ **Landing Page** - Page d'accueil
2. ✅ **Recherche** - Recherche de véhicules
3. ✅ **Filtres** - Filtres dynamiques
4. ⏭️ **Détails** - Voir les détails d'un listing
5. ⏭️ **Favoris** - Ajouter aux favoris (si authentification activée)

## 🐛 Dépannage

### Le frontend ne charge pas
- Vérifiez que Vite est démarré : `lsof -ti:5173`
- Redémarrez : `cd frontend && npm run dev`

### Le backend ne répond pas
- Vérifiez que le serveur est démarré : `lsof -ti:3001`
- Redémarrez : `cd backend && npm run dev`
- Vérifiez les logs pour les erreurs

### Pas de données
- Vérifiez Supabase : Les listings sont dans la table `listings`
- Testez l'API : `curl http://localhost:3001/api/v1/listings`

## 🎉 C'est Prêt !

L'application Carindex est maintenant accessible dans votre navigateur !







