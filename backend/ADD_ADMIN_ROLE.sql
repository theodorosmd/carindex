-- Script SQL pour ajouter le rôle admin
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter la colonne role si elle n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Créer l'index pour les performances
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin';

-- 3. Mettre à jour les utilisateurs existants (définir 'user' par défaut)
UPDATE users SET role = 'user' WHERE role IS NULL;

-- 4. Donner le rôle admin à theodore.dignet@gmail.com
UPDATE users SET role = 'admin' WHERE email = 'theodore.dignet@gmail.com';

-- 5. Vérifier que ça a fonctionné
SELECT email, role, plan FROM users WHERE email = 'theodore.dignet@gmail.com';







