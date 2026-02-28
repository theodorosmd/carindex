# Migration 032 - sales_aggregates (version granulaire)

Remplace la table sales_aggregates par une structure granulaire : **même marque, même modèle, même carburant, même finition, même moteur**.

Clés : `brand`, `model`, `fuel_type`, `trim`, `engine`, `location_country`
- **engine** = `version` (motorisation) ou fallback `displacement_power` (ex: 1500_150)
- **trim** = finition
- **fuel_type** = carburant

## Exécution

1. **Supabase SQL Editor** : exécuter `src/database/migrations/032_sales_aggregates_by_model.sql`
   - DROP la table 031, recrée avec la nouvelle structure

2. **Backfill** :
   ```bash
   cd backend && node src/scripts/backfill-sales-aggregates.js
   ```

La table se met à jour automatiquement à chaque `markAsSold` (job de détection des ventes).
