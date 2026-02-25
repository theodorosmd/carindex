# Migration 009: Add French Malus Fields

Cette migration ajoute les colonnes nécessaires pour le calcul du malus écologique français dans la table `auction_listings`.

## Colonnes ajoutées

- `co2_g_km_wltp` (INTEGER) - Émissions CO₂ en g/km (WLTP)
- `mass_kg` (INTEGER) - Masse du véhicule en kg (pour le malus poids - non implémenté)
- `first_registration_date` (DATE) - Date de première immatriculation (à l'étranger)
- `vehicle_category` (VARCHAR(10)) - Catégorie du véhicule (VP, VUL, OTHER)
- `is_first_registration_in_france` (BOOLEAN) - Première immatriculation en France

## Instructions

1. Ouvrez le SQL Editor dans Supabase : https://app.supabase.com/project/[VOTRE_PROJECT_ID]/sql/new

2. Copiez et collez le contenu du fichier `backend/src/database/migrations/009_add_french_malus_fields.sql`

3. Exécutez la requête (Run)

4. Vérifiez que les colonnes ont été ajoutées :
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'auction_listings' 
   AND column_name IN ('co2_g_km_wltp', 'mass_kg', 'first_registration_date', 'vehicle_category', 'is_first_registration_in_france');
   ```

## Notes

- Toutes les colonnes sont optionnelles (NULL autorisé)
- `vehicle_category` a une valeur par défaut de 'VP'
- `is_first_registration_in_france` a une valeur par défaut de TRUE
