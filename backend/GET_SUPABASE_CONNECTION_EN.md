# Get Supabase Connection URL

## Problem
The PostgreSQL connection URL is not correct. Here's how to get the correct URL.

## Steps

### 1. Go to Supabase Dashboard
1. Log in to [supabase.com](https://supabase.com)
2. Select your project: **jgrebihiurfmuhfftsoa**

### 2. Get Connection URL
1. Go to **Settings** (⚙️) → **Database**
2. Scroll down to the **Connection string** section
3. You'll see several options:
   - **URI** - Direct connection
   - **Connection pooling** - Connection with pooler (recommended)

### 3. Copy Correct URL

#### Option A: Direct URI (for initial setup)
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

#### Option B: Connection Pooling (recommended for production)
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 4. Replace in .env

In `backend/.env`, replace `DATABASE_URL` with the URL you copied.

**Important**: If the password contains special characters (+, /, =), you must URL-encode them:
- `+` becomes `%2B`
- `/` becomes `%2F`
- `=` becomes `%3D`

### 5. Test Connection

```bash
cd backend
node src/scripts/setup-supabase.js
```

## Alternative: Use Supabase Interface

If you prefer, you can also:
1. Go to **SQL Editor** in Supabase
2. Copy the content of `backend/src/database/schema.sql`
3. Paste and execute in the SQL editor
4. Then run `backend/src/database/migrations/001_add_listing_fields.sql`

## Verification

To verify that the connection works:

```bash
cd backend
node -e "
import('./src/config/database.js').then(async ({db}) => {
  try {
    const result = await db.query('SELECT NOW() as time, version() as version');
    console.log('✅ Connection successful!');
    console.log('Time:', result.rows[0].time);
    console.log('PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
});
"
```
