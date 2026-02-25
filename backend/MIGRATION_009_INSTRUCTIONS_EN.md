# Migration 009: Add French Malus Fields

This migration adds the necessary columns for French ecological malus calculation in the `auction_listings` table.

## Added Columns

- `co2_g_km_wltp` (INTEGER) - CO₂ emissions in g/km (WLTP)
- `mass_kg` (INTEGER) - Vehicle mass in kg (for weight malus - not implemented)
- `first_registration_date` (DATE) - First registration date (abroad)
- `vehicle_category` (VARCHAR(10)) - Vehicle category (VP, VUL, OTHER)
- `is_first_registration_in_france` (BOOLEAN) - First registration in France

## Instructions

1. Open SQL Editor in Supabase: https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql/new

2. Copy and paste the content of file `backend/src/database/migrations/009_add_french_malus_fields.sql`

3. Execute the query (Run)

4. Verify that columns have been added:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'auction_listings' 
   AND column_name IN ('co2_g_km_wltp', 'mass_kg', 'first_registration_date', 'vehicle_category', 'is_first_registration_in_france');
   ```

## Notes

- All columns are optional (NULL allowed)
- `vehicle_category` has a default value of 'VP'
- `is_first_registration_in_france` has a default value of TRUE
