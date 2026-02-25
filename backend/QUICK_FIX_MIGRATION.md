# 🔧 Correction rapide : Exécuter la migration 007

## Problème
L'erreur `Could not find the table 'public.auction_listings'` indique que les tables nécessaires n'existent pas.

## Solution rapide (2 minutes)

### Étape 1 : Ouvrir Supabase Dashboard
1. Allez sur https://app.supabase.com
2. Connectez-vous et sélectionnez votre projet

### Étape 2 : Ouvrir SQL Editor
1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"New query"**

### Étape 3 : Copier-coller le SQL
Copiez tout le contenu du fichier ci-dessous et collez-le dans l'éditeur SQL :

```sql
-- Migration 007: Add Auction Margin Calculator tables
-- Creates tables for auction listings, comparable listings, and margin calculations

-- Auction listings table
CREATE TABLE IF NOT EXISTS auction_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    source_listing_id VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    trim VARCHAR(255),
    year INTEGER NOT NULL,
    fuel_type VARCHAR(50),
    transmission VARCHAR(50),
    power_hp INTEGER,
    mileage INTEGER NOT NULL,
    body_type VARCHAR(100),
    color VARCHAR(50),
    vin VARCHAR(255),
    auction_price_sek DECIMAL(12,2) NOT NULL,
    auction_fee_eur DECIMAL(10,2) DEFAULT 0,
    url TEXT,
    raw_data JSONB,
    condition_notes TEXT,
    vat_deductible BOOLEAN DEFAULT FALSE,
    estimated_reconditioning_eur DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source, source_listing_id)
);

-- Comparable listings table (from Leboncoin)
CREATE TABLE IF NOT EXISTS comparable_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL DEFAULT 'leboncoin',
    fetched_at TIMESTAMP DEFAULT NOW(),
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    price_eur DECIMAL(12,2) NOT NULL,
    year INTEGER NOT NULL,
    mileage_km INTEGER NOT NULL,
    fuel_type VARCHAR(20),
    transmission VARCHAR(20),
    power_hp INTEGER,
    trim_text VARCHAR(255),
    location_department VARCHAR(10),
    seller_type VARCHAR(20),
    raw_json JSONB,
    match_score DECIMAL(4,3) DEFAULT 0,
    auction_listing_id UUID REFERENCES auction_listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Margin calculations table
CREATE TABLE IF NOT EXISTS margin_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_listing_id UUID NOT NULL REFERENCES auction_listings(id) ON DELETE CASCADE,
    target_departments INTEGER[] NOT NULL,
    selected_comparables UUID[] DEFAULT ARRAY[]::UUID[],
    price_estimate_low DECIMAL(12,2) NOT NULL,
    price_estimate_mid DECIMAL(12,2) NOT NULL,
    price_estimate_high DECIMAL(12,2) NOT NULL,
    costs_breakdown_json JSONB NOT NULL,
    margin_low DECIMAL(12,2) NOT NULL,
    margin_mid DECIMAL(12,2) NOT NULL,
    margin_high DECIMAL(12,2) NOT NULL,
    fx_rate DECIMAL(8,6) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_listings_source ON auction_listings(source, source_listing_id);
CREATE INDEX IF NOT EXISTS idx_auction_listings_brand_model ON auction_listings(brand, model);
CREATE INDEX IF NOT EXISTS idx_comparable_listings_auction_id ON comparable_listings(auction_listing_id);
CREATE INDEX IF NOT EXISTS idx_comparable_listings_match_score ON comparable_listings(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_comparable_listings_location ON comparable_listings(location_department);
CREATE INDEX IF NOT EXISTS idx_margin_calculations_auction_id ON margin_calculations(auction_listing_id);
CREATE INDEX IF NOT EXISTS idx_margin_calculations_created_at ON margin_calculations(created_at DESC);
```

### Étape 4 : Exécuter
1. Cliquez sur le bouton **"Run"** (ou appuyez sur `Cmd+Enter` / `Ctrl+Enter`)
2. Attendez le message de succès

### Étape 5 : Vérifier
Exécutez cette requête pour vérifier que les tables existent :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('auction_listings', 'comparable_listings', 'margin_calculations')
ORDER BY table_name;
```

Vous devriez voir 3 lignes avec les noms des tables.

### Étape 6 : Recharger l'application
Rechargez la page du calculateur de marge dans votre navigateur et réessayez.

## ✅ C'est fait !

Les tables sont maintenant créées et le calculateur de marge devrait fonctionner.
