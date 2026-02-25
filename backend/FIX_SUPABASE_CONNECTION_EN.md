# 🔧 Fix Supabase Connection

## ❌ Current Problem

The PostgreSQL connection URL in `.env` is not working:
```
getaddrinfo ENOTFOUND db.jgrebihiurfmuhfftsoa.supabase.co
```

## ✅ Solution: Get Correct URL

### Step 1: Access Database Settings

**Direct link**: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database

### Step 2: Verify Project is Active

- If you see a "Restore project" or "Resume project" button, your project is paused
- Click "Restore project" to reactivate it
- Wait a few minutes for the project to be ready

### Step 3: Copy Connection URL

1. On the **Settings → Database** page, find the **"Connection string"** section
2. Click on the **"URI"** tab (not "JDBC" or "Connection pooling")
3. You'll see a URL in the format:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Step 4: Update .env

1. Open `backend/.env`
2. Replace the `DATABASE_URL` line with the URL copied from Supabase
3. **Important**: If the password contains special characters, encode them:
   - `+` → `%2B`
   - `/` → `%2F`
   - `=` → `%3D`
   - `@` → `%40`
   - `#` → `%23`

### Step 5: Test Connection

```bash
cd backend
node src/scripts/test-supabase-connection.js
```

## 🔍 Alternative: Use Supabase API

If you prefer to use Supabase API directly (without direct PostgreSQL), you can use the API keys already configured:

- `SUPABASE_URL`: https://jgrebihiurfmuhfftsoa.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: (already in .env)

These keys allow you to use Supabase REST API instead of direct PostgreSQL.

## 📝 Example Correct URL

Typical format for Supabase:

**Connection Pooling (recommended)**:
```
postgresql://postgres.jgrebihiurfmuhfftsoa:[PASSWORD_ENCODED]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Direct Connection**:
```
postgresql://postgres:[PASSWORD_ENCODED]@db.jgrebihiurfmuhfftsoa.supabase.co:5432/postgres
```

## ✅ Final Verification

Once the URL is updated, test:

```bash
cd backend
node -e "
import('dotenv/config.js').then(() => import('./src/config/database.js')).then(async ({db}) => {
  try {
    const result = await db.query('SELECT NOW() as time');
    console.log('✅ Supabase connection successful!');
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
});
"
```
