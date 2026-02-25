# 🚀 Instructions pour activer l'accès Admin

## ✅ Diagnostic
L'utilisateur `theodoredignet@gmail.com` existe dans la base de données mais son rôle est actuellement `user` au lieu de `admin`.

## Solution en 2 étapes

### Étape 1 : Exécuter le SQL dans Supabase (2 minutes)

1. **Ouvrez Supabase** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Allez dans SQL Editor** (menu de gauche)
4. **Ouvrez le fichier** `SET_ADMIN_NOW.sql` à la racine du projet
5. **Copiez-collez le SQL** dans l'éditeur Supabase
6. **Cliquez sur "Run"** (ou appuyez sur F5)

**OU** copiez-collez directement ce SQL :

```sql
-- Ajouter la colonne role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Créer l'index
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin';

-- Mettre à jour les utilisateurs existants
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Donner le rôle admin à theodoredignet@gmail.com
UPDATE users SET role = 'admin' WHERE email = 'theodoredignet@gmail.com';

-- Vérifier
SELECT email, role, plan FROM users WHERE email = 'theodoredignet@gmail.com';
```

7. **Vérifiez les résultats** - vous devriez voir :
```
email                        | role  | plan
theodoredignet@gmail.com     | admin | starter
```

### Étape 2 : Rafraîchir la page

1. **Rechargez la page** du dashboard (F5 ou Cmd+R)
2. Vous serez **automatiquement redirigé** vers `#/admin`

**OU**

1. **Déconnectez-vous** puis **reconnectez-vous**
2. Vous serez automatiquement redirigé vers le dashboard admin

---

## Vérification

Une fois sur le dashboard admin, vous devriez voir :
- ✅ **Titre** : "Admin Dashboard" (au lieu de "Dashboard")
- ✅ **Badge rouge** "ADMIN" à côté de votre email
- ✅ **4 cartes de statistiques** : Utilisateurs, Annonces, Alertes, Plans
- ✅ **Table de gestion des utilisateurs** avec possibilité de modifier plans et rôles
- ✅ **Distribution des annonces par source**

---

## Si ça ne fonctionne toujours pas

1. **Ouvrez la console du navigateur** (F12)
2. **Tapez** : `localStorage.getItem('carindex_user')`
3. **Vérifiez** que vous voyez `"role":"admin"` dans le JSON

Si le rôle n'est pas là :
- Déconnectez-vous complètement
- Reconnectez-vous
- Le rôle devrait maintenant être présent

---

## Accès direct au dashboard admin

Après avoir exécuté le SQL, vous pouvez aussi aller directement sur :
```
http://localhost:5173/#/admin
```

Le système vérifiera automatiquement votre rôle.

