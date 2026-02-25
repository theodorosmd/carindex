# Configuration Admin - Instructions Simples

## Étape 1 : Ajouter la colonne `role` dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Exécutez ce SQL :

```sql
-- Ajouter la colonne role si elle n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Créer l'index
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin';

-- Mettre à jour les utilisateurs existants
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Donner le rôle admin à theodore.dignet@gmail.com
UPDATE users SET role = 'admin' WHERE email = 'theodore.dignet@gmail.com';
```

## Étape 2 : Se reconnecter

Après avoir exécuté le SQL :
1. **Déconnectez-vous** de l'application
2. **Reconnectez-vous** avec `theodore.dignet@gmail.com`
3. Vous serez automatiquement redirigé vers le dashboard admin (`#/admin`)

## Vérification

Pour vérifier que ça fonctionne :
1. Ouvrez la console du navigateur (F12)
2. Tapez : `JSON.parse(localStorage.getItem('carindex_user'))`
3. Vous devriez voir `role: "admin"`

## Si ça ne fonctionne toujours pas

1. Vérifiez dans Supabase que l'utilisateur a bien `role = 'admin'` :
   ```sql
   SELECT email, role FROM users WHERE email = 'theodore.dignet@gmail.com';
   ```

2. Videz le cache du navigateur et reconnectez-vous

3. Vérifiez que le backend retourne bien le rôle dans `/api/v1/auth/login`







