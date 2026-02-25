# Créer un utilisateur administrateur

## Méthode 1 : Script Node.js (Recommandé)

Exécutez le script de création d'admin :

```bash
cd backend
node src/scripts/create-admin.js <email> <password>
```

Exemple :
```bash
node src/scripts/create-admin.js admin@carindex.com MonMotDePasse123
```

**Note :** Si l'utilisateur existe déjà, le script mettra à jour son mot de passe et lui donnera le rôle admin.

## Méthode 2 : Via Supabase SQL Editor

1. Connectez-vous à votre projet Supabase
2. Allez dans l'éditeur SQL
3. Exécutez cette requête (remplacez l'email et le hash du mot de passe) :

```sql
-- D'abord, créer l'utilisateur (si nécessaire)
INSERT INTO users (email, password_hash, plan, role)
VALUES ('admin@carindex.com', '$2a$10$VOTRE_HASH_BCRYPT_ICI', 'plus', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Ou mettre à jour un utilisateur existant
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@carindex.com';
```

**Pour générer un hash bcrypt :**
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('VotreMotDePasse', 10).then(hash => console.log(hash));"
```

## Méthode 3 : Via l'interface Admin (après avoir créé le premier admin)

1. Connectez-vous avec un compte admin
2. Allez sur `/admin`
3. Utilisez la fonction "Donner Admin" sur n'importe quel utilisateur

## Vérifier qu'un utilisateur est admin

```sql
SELECT id, email, role, plan FROM users WHERE role = 'admin';
```

## Accès au dashboard admin

Une fois connecté avec un compte admin, vous serez automatiquement redirigé vers `/admin` au lieu de `/dashboard`.

L'URL directe est : `#/admin`







