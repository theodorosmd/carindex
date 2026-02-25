# 🔑 Obtenir le Mot de Passe de la Base de Données

## ⚠️ Différence Importante

Le secret que vous avez fourni (`[VOTRE_SERVICE_ROLE_KEY]`) semble être un **service role key** ou un **secret d'API**, **PAS** le mot de passe de la base de données PostgreSQL.

## 🎯 Comment Obtenir le Vrai Mot de Passe

### Option 1 : Réinitialiser le Mot de Passe

1. Allez sur : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
2. Section **"Database password"**
3. Cliquez sur **"Reset database password"**
4. **Copiez le nouveau mot de passe** (il ne sera affiché qu'une fois !)
5. Utilisez ce mot de passe pour construire l'URL

### Option 2 : Vérifier si le Mot de Passe est Déjà Visible

Sur la page Database Settings, cherchez :
- Un champ **"Database password"** avec un bouton **"Show"** ou **"Reveal"**
- Ou un champ qui affiche le mot de passe (masqué avec des points)

## 📝 Format de l'URL avec le Vrai Mot de Passe

Une fois que vous avez le mot de passe, l'URL devrait être :

```
postgresql://postgres.jgrebihiurfmuhfftsoa:[VOTRE_MOT_DE_PASSE]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important** : Encodez le mot de passe si nécessaire (`@` → `%40`, `+` → `%2B`, etc.)

## 🧪 Test Rapide

Une fois le mot de passe obtenu, testez avec :

```bash
cd backend
node src/scripts/build-supabase-url.js
```

Le script vous demandera le mot de passe et testera automatiquement.

## 🔄 Alternative : Utiliser l'API Supabase

Si la connexion PostgreSQL directe continue à poser problème, nous pouvons modifier le code pour utiliser l'API REST Supabase au lieu de PostgreSQL direct.

Vous avez déjà :
- ✅ `SUPABASE_URL` : https://jgrebihiurfmuhfftsoa.supabase.co
- ✅ `SUPABASE_SERVICE_ROLE_KEY` : (déjà dans .env)

Cela nécessiterait de remplacer les requêtes SQL directes par des appels à l'API REST Supabase.







