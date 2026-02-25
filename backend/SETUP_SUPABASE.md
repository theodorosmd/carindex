# Configuration avec Supabase

Supabase est une excellente alternative cloud à PostgreSQL. Voici comment configurer Carindex avec Supabase.

## 1. Créer un Projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte (gratuit)
3. Créez un nouveau projet
4. Notez les informations de connexion

## 2. Obtenir l'URL de Connexion

Dans votre projet Supabase :
1. Allez dans **Settings** → **Database**
2. Trouvez la section **Connection string**
3. Sélectionnez **URI** ou **Connection pooling**
4. Copiez l'URL (format : `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`)

## 3. Configurer le .env

Mettez à jour votre fichier `backend/.env` :

```env
# Supabase Database URL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Ou avec connection pooling (recommandé pour production)
# DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important** : Remplacez `[YOUR-PASSWORD]` et `[PROJECT-REF]` par vos valeurs réelles.

## 4. Exécuter le Schéma Initial

Dans Supabase SQL Editor :
1. Allez dans **SQL Editor**
2. Créez une nouvelle requête
3. Copiez le contenu de `backend/src/database/schema.sql`
4. Exécutez la requête

## 5. Exécuter la Migration

```bash
cd backend
node src/scripts/run-migration.js
```

## 6. Vérifier la Connexion

Testez la connexion :

```bash
cd backend
node -e "
import { db } from './src/config/database.js';
try {
  const result = await db.query('SELECT NOW()');
  console.log('✅ Connexion Supabase réussie!', result.rows[0]);
  process.exit(0);
} catch (error) {
  console.error('❌ Erreur de connexion:', error.message);
  process.exit(1);
}
"
```

## Avantages de Supabase

- ✅ Pas besoin d'installer PostgreSQL localement
- ✅ Base de données cloud accessible partout
- ✅ Interface graphique pour gérer les données
- ✅ Backups automatiques
- ✅ Plan gratuit généreux (500MB)
- ✅ API REST automatique
- ✅ Authentification intégrée

## Configuration Recommandée

Pour la production, utilisez **Connection Pooling** :

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Sécurité

⚠️ **Important** : Ne commitez jamais votre `.env` avec les vraies credentials Supabase !

Votre `.gitignore` devrait déjà exclure `.env`, mais vérifiez :

```bash
cat .gitignore | grep -E "\.env|env"
```

## Migration depuis PostgreSQL Local

Si vous avez déjà des données en local :

1. Exportez vos données :
   ```bash
   pg_dump -h localhost -U postgres carindex > backup.sql
   ```

2. Importez dans Supabase :
   - Utilisez le SQL Editor de Supabase
   - Ou utilisez `psql` avec l'URL Supabase








