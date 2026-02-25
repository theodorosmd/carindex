# 🔧 Correction de la Connexion Supabase

## ❌ Problème Actuel

L'URL de connexion PostgreSQL dans `.env` ne fonctionne pas :
```
getaddrinfo ENOTFOUND db.jgrebihiurfmuhfftsoa.supabase.co
```

## ✅ Solution : Obtenir l'URL Correcte

### Étape 1 : Accéder aux Settings Database

**Lien direct** : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database

### Étape 2 : Vérifier que le Projet est Actif

- Si vous voyez un bouton "Restore project" ou "Resume project", votre projet est en pause
- Cliquez sur "Restore project" pour le réactiver
- Attendez quelques minutes que le projet soit prêt

### Étape 3 : Copier l'URL de Connexion

1. Dans la page **Settings → Database**, trouvez la section **"Connection string"**
2. Cliquez sur l'onglet **"URI"** (pas "JDBC" ni "Connection pooling")
3. Vous verrez une URL au format :
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   OU
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Étape 4 : Mettre à Jour le .env

1. Ouvrez `backend/.env`
2. Remplacez la ligne `DATABASE_URL` par l'URL copiée depuis Supabase
3. **Important** : Si le mot de passe contient des caractères spéciaux, encodez-les :
   - `+` → `%2B`
   - `/` → `%2F`
   - `=` → `%3D`
   - `@` → `%40`
   - `#` → `%23`

### Étape 5 : Tester la Connexion

```bash
cd backend
node src/scripts/test-supabase-connection.js
```

## 🔍 Alternative : Utiliser l'API Supabase

Si vous préférez utiliser l'API Supabase directement (sans PostgreSQL direct), vous pouvez utiliser les clés API déjà configurées :

- `SUPABASE_URL` : https://jgrebihiurfmuhfftsoa.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` : (déjà dans .env)

Ces clés permettent d'utiliser l'API REST de Supabase au lieu de PostgreSQL direct.

## 📝 Exemple d'URL Correcte

Format typique pour Supabase :

**Connection Pooling (recommandé)** :
```
postgresql://postgres.jgrebihiurfmuhfftsoa:[PASSWORD_ENCODED]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Direct Connection** :
```
postgresql://postgres:[PASSWORD_ENCODED]@db.jgrebihiurfmuhfftsoa.supabase.co:5432/postgres
```

## ✅ Vérification Finale

Une fois l'URL mise à jour, testez :

```bash
cd backend
node -e "
import('dotenv/config.js').then(() => import('./src/config/database.js')).then(async ({db}) => {
  try {
    const result = await db.query('SELECT NOW() as time');
    console.log('✅ Connexion Supabase réussie!');
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
});
"
```







