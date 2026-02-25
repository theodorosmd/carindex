# Setup with Supabase

Supabase is an excellent cloud alternative to PostgreSQL. Here's how to configure Carindex with Supabase.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create an account (free)
3. Create a new project
4. Note the connection information

## 2. Get the Connection URL

In your Supabase project:
1. Go to **Settings** → **Database**
2. Find the **Connection string** section
3. Select **URI** or **Connection pooling**
4. Copy the URL (format: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`)

## 3. Configure .env

Update your `backend/.env` file:

```env
# Supabase Database URL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Or with connection pooling (recommended for production)
# DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important**: Replace `[YOUR-PASSWORD]` and `[PROJECT-REF]` with your actual values.

## 4. Run Initial Schema

In Supabase SQL Editor:
1. Go to **SQL Editor**
2. Create a new query
3. Copy the content of `backend/src/database/schema.sql`
4. Execute the query

## 5. Run Migration

```bash
cd backend
node src/scripts/run-migration.js
```

## 6. Verify Connection

Test the connection:

```bash
cd backend
node -e "
import { db } from './src/config/database.js';
try {
  const result = await db.query('SELECT NOW()');
  console.log('✅ Supabase connection successful!', result.rows[0]);
  process.exit(0);
} catch (error) {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
}
"
```

## Supabase Advantages

- ✅ No need to install PostgreSQL locally
- ✅ Cloud database accessible anywhere
- ✅ Graphical interface to manage data
- ✅ Automatic backups
- ✅ Generous free plan (500MB)
- ✅ Automatic REST API
- ✅ Built-in authentication

## Recommended Configuration

For production, use **Connection Pooling**:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Security

⚠️ **Important**: Never commit your `.env` with real Supabase credentials!

Your `.gitignore` should already exclude `.env`, but verify:

```bash
cat .gitignore | grep -E "\.env|env"
```

## Migration from Local PostgreSQL

If you already have local data:

1. Export your data:
   ```bash
   pg_dump -h localhost -U postgres carindex > backup.sql
   ```

2. Import into Supabase:
   - Use Supabase SQL Editor
   - Or use `psql` with the Supabase URL
