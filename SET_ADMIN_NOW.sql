-- ============================================
-- SQL À EXÉCUTER DANS SUPABASE SQL EDITOR
-- ============================================
-- 
-- 1. Allez sur https://supabase.com/dashboard
-- 2. Sélectionnez votre projet
-- 3. Cliquez sur "SQL Editor" dans le menu de gauche
-- 4. Copiez-collez ce SQL ci-dessous
-- 5. Cliquez sur "Run" (ou appuyez sur F5)
--
-- ============================================

-- Étape 1: Ajouter la colonne role si elle n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Étape 2: Créer l'index pour les performances
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin';

-- Étape 3: Mettre à jour tous les utilisateurs existants (définir 'user' par défaut)
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Étape 4: DONNER LE RÔLE ADMIN à theodore.dignet@gmail.com
UPDATE users SET role = 'admin' WHERE email = 'theodoredignet@gmail.com';

-- Étape 5: VÉRIFIER que ça a fonctionné
SELECT email, role, plan FROM users WHERE email = 'theodoredignet@gmail.com';

-- ============================================
-- RÉSULTAT ATTENDU:
-- ============================================
-- email                      | role  | plan
-- theodoredignet@gmail.com   | admin | starter
-- ============================================
--
-- Après avoir exécuté ce SQL:
-- 1. Rechargez la page du dashboard (F5)
-- 2. Vous serez automatiquement redirigé vers #/admin
-- 
-- OU
--
-- 1. Déconnectez-vous
-- 2. Reconnectez-vous
-- 3. Vous serez automatiquement redirigé vers #/admin
-- ============================================







