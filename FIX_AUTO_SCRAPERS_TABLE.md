# 🔧 Fix : Colonnes manquantes dans auto_scrapers

## Problème

L'erreur `Could not find the 'max_results' column of 'auto_scrapers' in the schema cache` indique que les colonnes `max_results` et `result_limit_per_thread` n'existent pas dans la table `auto_scrapers` dans Supabase.

## Solution

### Option 1 : Via Supabase SQL Editor (RECOMMANDÉ)

1. **Allez dans Supabase Dashboard** → **SQL Editor**
2. **Créez une nouvelle requête**
3. **Copiez-collez ce SQL** :

```sql
-- Add max_results and result_limit_per_thread columns to auto_scrapers table
ALTER TABLE auto_scrapers 
ADD COLUMN IF NOT EXISTS max_results INTEGER DEFAULT 1000;

ALTER TABLE auto_scrapers 
ADD COLUMN IF NOT EXISTS result_limit_per_thread INTEGER DEFAULT 100;

-- Update existing records to have default values if they are NULL
UPDATE auto_scrapers 
SET max_results = 1000 
WHERE max_results IS NULL;

UPDATE auto_scrapers 
SET result_limit_per_thread = 100 
WHERE result_limit_per_thread IS NULL;
```

4. **Cliquez sur "Run"** (ou `Cmd+Enter`)
5. **Vérifiez que les colonnes ont été ajoutées** :

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'auto_scrapers' 
ORDER BY ordinal_position;
```

Vous devriez voir `max_results` et `result_limit_per_thread` dans la liste.

### Option 2 : Vérifier que la table existe complètement

Si la table `auto_scrapers` n'existe pas du tout, exécutez d'abord :

```sql
-- Table pour stocker les configurations de scraping automatique
CREATE TABLE IF NOT EXISTS auto_scrapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin')),
  name VARCHAR(255) NOT NULL,
  search_urls TEXT[] NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL,
  max_results INTEGER DEFAULT 1000,
  result_limit_per_thread INTEGER DEFAULT 100,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20),
  last_run_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_scrapers_source ON auto_scrapers(source);
CREATE INDEX IF NOT EXISTS idx_auto_scrapers_enabled ON auto_scrapers(enabled) WHERE enabled = true;
```

## Vérification

Après avoir exécuté le SQL, **rechargez la page admin** et essayez de créer un nouveau scraping. L'erreur devrait disparaître.

## Si le problème persiste

1. Vérifiez que vous êtes dans le bon projet Supabase
2. Vérifiez que la table `auto_scrapers` existe : `SELECT * FROM auto_scrapers LIMIT 1;`
3. Vérifiez les colonnes : `\d auto_scrapers` (dans psql) ou via Supabase Table Editor







