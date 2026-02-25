# 🔍 Comment Obtenir l'URL PostgreSQL Supabase

## ⚠️ Page Actuelle vs Page Nécessaire

Vous êtes actuellement sur la page **"API Settings"** qui montre :
- ✅ URL API REST : `https://jgrebihiurfmuhfftsoa.supabase.co`
- ❌ Mais **PAS** l'URL PostgreSQL pour la connexion directe

## 🎯 Page à Ouvrir : "Database Settings"

Pour obtenir l'URL PostgreSQL, vous devez aller sur une **autre page** :

### Option 1 : Navigation Directe

**Lien direct** : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database

### Option 2 : Navigation Manuelle

1. Dans le menu latéral gauche du dashboard Supabase
2. Cliquez sur **"Settings"** (⚙️)
3. Puis cliquez sur **"Database"** (pas "API")

## 📍 Ce que Vous Devriez Voir

Sur la page **"Database Settings"**, vous trouverez :

### Section "Connection string"

Cette section contient plusieurs onglets :
- **URI** ← **UTILISEZ CELUI-CI**
- JDBC
- Connection pooling
- etc.

### Format de l'URL Attendue

L'URL dans l'onglet **"URI"** devrait ressembler à :

```
postgresql://postgres.jgrebihiurfmuhfftsoa:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

OU

```
postgresql://postgres:[PASSWORD]@db.jgrebihiurfmuhfftsoa.supabase.co:5432/postgres
```

## 📋 Étapes Complètes

1. **Ouvrez** : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
2. **Faites défiler** jusqu'à la section **"Connection string"**
3. **Cliquez** sur l'onglet **"URI"**
4. **Copiez** l'URL complète (elle contient déjà le mot de passe)
5. **Collez** dans `backend/.env` comme `DATABASE_URL=`

## 🔄 Différence Entre les Deux URLs

| Type | URL | Usage |
|------|-----|-------|
| **API REST** | `https://jgrebihiurfmuhfftsoa.supabase.co` | Pour utiliser l'API Supabase (déjà configuré ✅) |
| **PostgreSQL** | `postgresql://postgres:...@...` | Pour connexion directe PostgreSQL (à configurer ❌) |

## ✅ Après Avoir Copié l'URL

1. Ouvrez `backend/.env`
2. Remplacez la ligne `DATABASE_URL=...` par l'URL copiée
3. Testez avec :
   ```bash
   cd backend
   node src/scripts/find-supabase-url.js
   ```

## 🆘 Si Vous Ne Trouvez Pas la Section

Si vous ne voyez pas la section "Connection string" :

1. Vérifiez que vous êtes bien sur **Settings → Database** (pas API)
2. Le projet pourrait être en pause → vérifiez en haut de la page
3. Vous pourriez avoir besoin de permissions admin







