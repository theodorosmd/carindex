# 📋 Guide Étape par Étape : Obtenir l'URL PostgreSQL Supabase

## ✅ État Actuel

- ✅ Projet Supabase est **ACTIF** (API accessible)
- ✅ Scrapers Puppeteer opérationnels
- ❌ URL PostgreSQL non trouvée automatiquement

## 🎯 Solution : Copier l'URL depuis le Dashboard

Les URLs PostgreSQL Supabase varient selon la région et la configuration. Il est **essentiel** de copier l'URL exacte depuis votre dashboard.

### Étape 1 : Accéder aux Settings Database

**Lien direct** : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database

### Étape 2 : Trouver la Section "Connection string"

Dans la page Settings → Database, vous verrez une section **"Connection string"** avec plusieurs onglets :

- **URI** ← **UTILISEZ CELUI-CI**
- JDBC
- Connection pooling
- etc.

### Étape 3 : Sélectionner l'Onglet "URI"

Cliquez sur l'onglet **"URI"** (pas "Connection pooling" pour l'instant).

### Étape 4 : Copier l'URL Complète

Vous verrez une URL au format :
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

OU

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**⚠️ IMPORTANT** : Copiez l'URL **COMPLÈTE** telle qu'elle apparaît, y compris le mot de passe.

### Étape 5 : Mettre à Jour le .env

1. Ouvrez `backend/.env`
2. Trouvez la ligne `DATABASE_URL=`
3. Remplacez-la par l'URL que vous avez copiée

**Exemple** :
```env
DATABASE_URL=postgresql://postgres.jgrebihiurfmuhfftsoa:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### Étape 6 : Encoder le Mot de Passe (si nécessaire)

Si le mot de passe contient des caractères spéciaux, vous devez les encoder :

- `+` → `%2B`
- `/` → `%2F`
- `=` → `%3D`
- `@` → `%40`
- `#` → `%23`
- ` ` (espace) → `%20`

**Astuce** : Si vous copiez l'URL directement depuis Supabase, elle devrait déjà être encodée correctement.

### Étape 7 : Tester la Connexion

```bash
cd backend
node src/scripts/find-supabase-url.js
```

Ou test simple :
```bash
cd backend
node -e "
import('dotenv/config.js').then(() => import('./src/config/database.js')).then(async ({db}) => {
  try {
    const result = await db.query('SELECT NOW() as time');
    console.log('✅ Connexion Supabase réussie!');
    console.log('Time:', result.rows[0].time);
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
});
"
```

## 🔍 Si l'URL ne Fonctionne Toujours Pas

### Option A : Réinitialiser le Mot de Passe

1. Allez sur : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
2. Trouvez la section **"Database password"**
3. Cliquez sur **"Reset database password"**
4. Copiez le nouveau mot de passe
5. Mettez à jour `DATABASE_URL` avec le nouveau mot de passe

### Option B : Utiliser Connection Pooling

Si l'URL "URI" ne fonctionne pas, essayez l'onglet **"Connection pooling"** :

1. Dans "Connection string", sélectionnez l'onglet **"Connection pooling"**
2. Choisissez **"Transaction mode"** (recommandé)
3. Copiez l'URL
4. Mettez à jour `DATABASE_URL`

### Option C : Vérifier les Logs

1. Allez sur : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/logs/explorer
2. Vérifiez s'il y a des erreurs de connexion
3. Vérifiez les logs PostgreSQL

## 📸 Capture d'Écran Attendue

Dans Settings → Database, vous devriez voir quelque chose comme :

```
Connection string
┌─────────────────────────────────────────────────────────┐
│ URI │ JDBC │ Connection pooling │ ...                   │
├─────────────────────────────────────────────────────────┤
│ postgresql://postgres.jgrebihiurfmuhfftsoa:...          │
│ @aws-0-eu-central-1.pooler.supabase.com:6543/postgres  │
└─────────────────────────────────────────────────────────┘
```

## ✅ Une Fois la Connexion Réussie

Une fois que la connexion fonctionne, vous pourrez :

1. ✅ Lancer les scrapers Puppeteer
2. ✅ Sauvegarder les listings dans Supabase
3. ✅ Utiliser l'API complète

## 🆘 Besoin d'Aide ?

Si après avoir suivi ces étapes la connexion ne fonctionne toujours pas :

1. Vérifiez que le projet n'est pas en pause
2. Vérifiez que vous avez les bonnes permissions
3. Contactez le support Supabase si nécessaire







