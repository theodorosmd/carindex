# Obtenir l'URL de Connexion Supabase

## Problème
L'URL de connexion PostgreSQL n'est pas correcte. Voici comment obtenir la bonne URL.

## Étapes

### 1. Aller dans le Dashboard Supabase
1. Connectez-vous à [supabase.com](https://supabase.com)
2. Sélectionnez votre projet : **jgrebihiurfmuhfftsoa**

### 2. Obtenir l'URL de Connexion
1. Allez dans **Settings** (⚙️) → **Database**
2. Faites défiler jusqu'à la section **Connection string**
3. Vous verrez plusieurs options :
   - **URI** - Connexion directe
   - **Connection pooling** - Connexion avec pooler (recommandé)

### 3. Copier l'URL Correcte

#### Option A : URI Direct (pour setup initial)
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

#### Option B : Connection Pooling (recommandé pour production)
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 4. Remplacez dans .env

Dans `backend/.env`, remplacez `DATABASE_URL` par l'URL que vous avez copiée.

**Important** : Si le mot de passe contient des caractères spéciaux (+, /, =), vous devez les encoder en URL :
- `+` devient `%2B`
- `/` devient `%2F`
- `=` devient `%3D`

### 5. Tester la Connexion

```bash
cd backend
node src/scripts/setup-supabase.js
```

## Alternative : Utiliser l'Interface Supabase

Si vous préférez, vous pouvez aussi :
1. Aller dans **SQL Editor** dans Supabase
2. Copier le contenu de `backend/src/database/schema.sql`
3. Coller et exécuter dans l'éditeur SQL
4. Puis exécuter `backend/src/database/migrations/001_add_listing_fields.sql`

## Vérification

Pour vérifier que la connexion fonctionne :

```bash
cd backend
node -e "
import('./src/config/database.js').then(async ({db}) => {
  try {
    const result = await db.query('SELECT NOW() as time, version() as version');
    console.log('✅ Connexion réussie!');
    console.log('Time:', result.rows[0].time);
    console.log('PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
});
"
```








