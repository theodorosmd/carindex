# 🔍 Trouver la Section "Connection string"

## 📍 Où Chercher

La section **"Connection string"** devrait être visible sur la page Database Settings, généralement :

1. **Juste après** "Database password"
2. **Avant** "Connection pooling configuration"
3. Ou dans un **accordéon/onglet** à ouvrir

## 🔎 Actions à Essayer

### Option 1 : Faire Défiler la Page
- La section "Connection string" peut être **plus haut** sur la page
- Faites défiler vers le **haut** de la page Database Settings
- Cherchez un titre "Connection string" ou "Connection info"

### Option 2 : Chercher un Bouton
- Cherchez un bouton **"Show connection string"** ou **"Reveal connection string"**
- Ou un bouton **"Copy connection string"**
- Parfois c'est un bouton à côté de "Database password"

### Option 3 : Construire l'URL Manuellement

Si vous ne trouvez pas la section, nous pouvons construire l'URL manuellement avec :

1. **Le mot de passe** (que vous avez déjà ou que vous pouvez réinitialiser)
2. **Le format standard** Supabase

## 🛠️ Construction Manuelle de l'URL

Si vous avez le mot de passe de la base de données, nous pouvons construire l'URL.

### Format Standard Supabase

**Connection Pooling (recommandé)** :
```
postgresql://postgres.jgrebihiurfmuhfftsoa:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Direct Connection** :
```
postgresql://postgres:[PASSWORD]@db.jgrebihiurfmuhfftsoa.supabase.co:5432/postgres
```

### Étapes

1. **Obtenez le mot de passe** :
   - Si vous l'avez déjà, utilisez-le
   - Sinon, cliquez sur **"Reset database password"** et copiez le nouveau mot de passe

2. **Encodez le mot de passe** (si nécessaire) :
   - `+` → `%2B`
   - `/` → `%2F`
   - `=` → `%3D`
   - `@` → `%40`

3. **Construisez l'URL** :
   - Remplacez `[PASSWORD]` par votre mot de passe encodé
   - Essayez d'abord avec "Connection Pooling" (port 6543)

## 🧪 Test avec le Mot de Passe

Si vous avez le mot de passe, je peux créer un script qui teste automatiquement différentes combinaisons d'URLs avec votre mot de passe.







