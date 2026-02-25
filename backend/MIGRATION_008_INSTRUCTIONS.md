# Migration 008: Gestion des Évaluations

Cette migration ajoute la possibilité de sauvegarder, gérer et comparer les évaluations de marge.

## Changements

- Ajout de `user_id` pour associer les évaluations aux utilisateurs
- Ajout de `name` pour nommer les évaluations
- Ajout de `notes` pour ajouter des notes aux évaluations
- Ajout de `updated_at` pour suivre les modifications

## Instructions

### Option 1: Via Supabase SQL Editor (Recommandé)

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez le contenu de `backend/src/database/migrations/008_add_evaluations_management.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur **Run**

### Option 2: Via psql (si vous avez accès)

```bash
cd backend
psql $DATABASE_URL -f src/database/migrations/008_add_evaluations_management.sql
```

## Vérification

Après avoir exécuté la migration, vérifiez que les colonnes ont été ajoutées :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'margin_calculations' 
AND column_name IN ('user_id', 'name', 'notes', 'updated_at');
```

## Fonctionnalités

Une fois la migration exécutée, vous pourrez :

1. **Sauvegarder une évaluation** : Donnez un nom lors du calcul de marge
2. **Lister vos évaluations** : Accédez à `#/evaluations` ou `/evaluations`
3. **Voir une évaluation** : Cliquez sur "Voir" dans la liste
4. **Modifier une évaluation** : Changez le nom ou les notes
5. **Supprimer une évaluation** : Cliquez sur "Supprimer"
6. **Comparer des évaluations** : Sélectionnez 2-5 évaluations et cliquez sur "Comparer"
