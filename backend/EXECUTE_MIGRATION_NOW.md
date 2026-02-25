# 🚨 ACTION REQUISE : Exécuter la Migration 007

## ⚠️ Les tables n'existent pas encore dans votre base de données

## 📋 Instructions étape par étape

### Étape 1 : Ouvrir Supabase SQL Editor
1. Cliquez sur ce lien : **https://app.supabase.com/project/jgrebihiurfmuhfftsoa/sql/new**
2. Ou allez sur https://app.supabase.com → Sélectionnez votre projet → SQL Editor → New query

### Étape 2 : Copier le SQL
1. Ouvrez le fichier : `backend/MIGRATION_007_COPY_PASTE.sql`
2. Sélectionnez TOUT le contenu (Cmd+A / Ctrl+A)
3. Copiez (Cmd+C / Ctrl+C)

### Étape 3 : Coller et exécuter
1. Collez le SQL dans l'éditeur Supabase (Cmd+V / Ctrl+V)
2. Cliquez sur le bouton **"Run"** (en haut à droite)
3. Ou appuyez sur **Cmd+Enter** (Mac) / **Ctrl+Enter** (Windows/Linux)

### Étape 4 : Vérifier le succès
Vous devriez voir un message : **"Success. No rows returned"**

### Étape 5 : Vérifier que les tables existent
Exécutez cette requête dans le SQL Editor pour vérifier :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('auction_listings', 'comparable_listings', 'margin_calculations')
ORDER BY table_name;
```

Vous devriez voir 3 lignes avec les noms des tables.

### Étape 6 : Redémarrer et tester
1. Redémarrez le serveur backend (arrêtez avec Ctrl+C et relancez `npm run dev`)
2. Rechargez la page du calculateur de marge
3. Réessayez de calculer une marge

## 🔗 Lien direct
**https://app.supabase.com/project/jgrebihiurfmuhfftsoa/sql/new**

## 📁 Fichier SQL à copier
`backend/MIGRATION_007_COPY_PASTE.sql`

---

**Note** : Si vous avez déjà exécuté la migration mais voyez toujours l'erreur, essayez de redémarrer le serveur backend car Supabase peut mettre quelques secondes à mettre à jour le cache du schéma.
