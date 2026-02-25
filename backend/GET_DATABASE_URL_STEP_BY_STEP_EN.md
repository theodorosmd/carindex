# 📋 Step-by-Step Guide: Get Supabase PostgreSQL URL

## ✅ Current Status

- ✅ Supabase project is **ACTIVE** (API accessible)
- ✅ Puppeteer scrapers operational
- ❌ PostgreSQL URL not found automatically

## 🎯 Solution: Copy URL from Dashboard

Supabase PostgreSQL URLs vary by region and configuration. It is **essential** to copy the exact URL from your dashboard.

### Step 1: Access Database Settings

**Direct link**: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database

### Step 2: Find "Connection string" Section

On the Settings → Database page, you'll see a **"Connection string"** section with several tabs:

- **URI** ← **USE THIS ONE**
- JDBC
- Connection pooling
- etc.

### Step 3: Select "URI" Tab

Click on the **"URI"** tab (not "Connection pooling" for now).

### Step 4: Copy Complete URL

You'll see a URL in the format:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

OR

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**⚠️ IMPORTANT**: Copy the **COMPLETE** URL as it appears, including the password.

### Step 5: Update .env

1. Open `backend/.env`
2. Find the line `DATABASE_URL=`
3. Replace it with the URL you copied

**Example**:
```env
DATABASE_URL=postgresql://postgres.jgrebihiurfmuhfftsoa:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### Step 6: Encode Password (if necessary)

If the password contains special characters, you must encode them:

- `+` → `%2B`
- `/` → `%2F`
- `=` → `%3D`
- `@` → `%40`
- `#` → `%23`
- ` ` (space) → `%20`

**Tip**: If you copy the URL directly from Supabase, it should already be correctly encoded.

### Step 7: Test Connection

```bash
cd backend
node src/scripts/find-supabase-url.js
```

Or simple test:
```bash
cd backend
node -e "
import('dotenv/config.js').then(() => import('./src/config/database.js')).then(async ({db}) => {
  try {
    const result = await db.query('SELECT NOW() as time');
    console.log('✅ Supabase connection successful!');
    console.log('Time:', result.rows[0].time);
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
});
"
```

## 🔍 If URL Still Doesn't Work

### Option A: Reset Password

1. Go to: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
2. Find the **"Database password"** section
3. Click **"Reset database password"**
4. Copy the new password
5. Update `DATABASE_URL` with the new password

### Option B: Use Connection Pooling

If the "URI" URL doesn't work, try the **"Connection pooling"** tab:

1. In "Connection string", select the **"Connection pooling"** tab
2. Choose **"Transaction mode"** (recommended)
3. Copy the URL
4. Update `DATABASE_URL`

### Option C: Check Logs

1. Go to: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/logs/explorer
2. Check for connection errors
3. Check PostgreSQL logs

## 📸 Expected Screenshot

In Settings → Database, you should see something like:

```
Connection string
┌─────────────────────────────────────────────────────────┐
│ URI │ JDBC │ Connection pooling │ ...                   │
├─────────────────────────────────────────────────────────┤
│ postgresql://postgres.jgrebihiurfmuhfftsoa:...          │
│ @aws-0-eu-central-1.pooler.supabase.com:6543/postgres  │
└─────────────────────────────────────────────────────────┘
```

## ✅ Once Connection Successful

Once the connection works, you'll be able to:

1. ✅ Launch Puppeteer scrapers
2. ✅ Save listings in Supabase
3. ✅ Use the complete API

## 🆘 Need Help?

If after following these steps the connection still doesn't work:

1. Check that the project is not paused
2. Check that you have the correct permissions
3. Contact Supabase support if necessary
