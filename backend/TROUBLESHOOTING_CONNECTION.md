# 🔧 Dépannage de la Connexion Supabase

## ❌ Problème Actuel

Toutes les tentatives de connexion échouent avec :
- `Tenant or user not found` (Code: XX000)
- `getaddrinfo ENOTFOUND` (pour connexion directe)

## 🔍 Vérifications à Faire

### 1. Vérifier l'État du Projet

1. Allez sur : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa
2. Vérifiez en haut de la page si le projet est **actif** ou **en pause**
3. Si en pause, cliquez sur **"Restore project"** et attendez quelques minutes

### 2. Vérifier le Mot de Passe

Le mot de passe que vous avez fourni est : `Sanfrancisco@2025`

**Vérifications** :
- Est-ce le bon mot de passe ?
- Avez-vous réinitialisé le mot de passe récemment ?
- Le mot de passe dans Supabase est-il différent ?

**Solution** : Réinitialisez le mot de passe
1. Allez sur : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
2. Cliquez sur **"Reset database password"**
3. Copiez le nouveau mot de passe
4. Testez à nouveau

### 3. Vérifier la Région du Projet

La région du projet peut être différente de `eu-central-1`.

**Comment vérifier** :
1. Allez sur : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/general
2. Cherchez la section **"Region"** ou **"Infrastructure"**
3. Notez la région (ex: `eu-west-1`, `us-east-1`, etc.)

### 4. Vérifier les Restrictions Réseau

1. Allez sur : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
2. Section **"Network Restrictions"**
3. Vérifiez si des restrictions sont activées
4. Si "Restrict all access" est activé, désactivez-le temporairement pour tester

### 5. Obtenir l'URL Exacte depuis le Dashboard

**Méthode Alternative** :

1. Allez sur : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
2. Cherchez un bouton **"Show connection string"** ou **"Reveal connection string"**
3. Ou cherchez une section **"Connection info"** ou **"Database connection"**
4. Copiez l'URL complète telle qu'elle apparaît

### 6. Utiliser l'API Supabase (Alternative)

Si la connexion PostgreSQL directe ne fonctionne pas, vous pouvez utiliser l'API Supabase REST :

- ✅ `SUPABASE_URL` : https://jgrebihiurfmuhfftsoa.supabase.co
- ✅ `SUPABASE_SERVICE_ROLE_KEY` : (déjà configuré)

Cela nécessiterait de modifier le code pour utiliser l'API REST au lieu de PostgreSQL direct.

## 🧪 Test Après Corrections

Une fois les corrections effectuées, testez avec :

```bash
cd backend
node src/scripts/build-supabase-url.js
```

Ou testez manuellement avec le nouveau mot de passe.

## 📝 Informations Nécessaires

Pour résoudre le problème, j'aurais besoin de :

1. ✅ **Région du projet** (eu-central-1, eu-west-1, us-east-1, etc.)
2. ✅ **Mot de passe confirmé** (ou nouveau mot de passe après reset)
3. ✅ **État du projet** (actif ou en pause)
4. ✅ **Restrictions réseau** (activées ou non)
5. ✅ **URL complète** depuis le dashboard (si visible)







