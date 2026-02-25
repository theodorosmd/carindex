# Obtenir l'URL de Connexion Supabase

## 📍 Localisation dans Supabase

Pour obtenir l'URL de connexion PostgreSQL correcte :

1. **Allez sur** : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
   - (Settings → Database, pas General)

2. **Section "Connection string"**
   - Vous verrez plusieurs onglets : **URI**, **JDBC**, **Connection pooling**, etc.

3. **Sélectionnez l'onglet "URI"**
   - C'est l'URL de connexion directe (pas Connection pooling)

4. **Copiez l'URL complète**
   - Format attendu : `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   - OU : `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

## 🔧 Mise à Jour du .env

Une fois l'URL copiée, mettez à jour `DATABASE_URL` dans `backend/.env` :

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.jgrebihiurfmuhfftsoa.supabase.co:5432/postgres
```

**Important** : Si le mot de passe contient des caractères spéciaux, encodez-les :
- `+` → `%2B`
- `/` → `%2F`
- `=` → `%3D`

## ✅ Test de Connexion

Après avoir mis à jour l'URL, testez :

```bash
cd backend
node -e "
import('./src/config/database.js').then(async ({db}) => {
  try {
    const result = await db.query('SELECT NOW() as time, version() as version');
    console.log('✅ Connexion Supabase réussie!');
    console.log('Time:', result.rows[0].time);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
});
"
```

## 🔗 Lien Direct

**Settings Database** : https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database








