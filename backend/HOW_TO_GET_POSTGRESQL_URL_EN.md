# 🔍 How to Get Supabase PostgreSQL URL

## ⚠️ Current Page vs Required Page

You are currently on the **"API Settings"** page which shows:
- ✅ REST API URL: `https://jgrebihiurfmuhfftsoa.supabase.co`
- ❌ But **NOT** the PostgreSQL URL for direct connection

## 🎯 Page to Open: "Database Settings"

To get the PostgreSQL URL, you need to go to a **different page**:

### Option 1: Direct Navigation

**Direct link**: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database

### Option 2: Manual Navigation

1. In the left sidebar menu of Supabase dashboard
2. Click **"Settings"** (⚙️)
3. Then click **"Database"** (not "API")

## 📍 What You Should See

On the **"Database Settings"** page, you'll find:

### "Connection string" Section

This section contains several tabs:
- **URI** ← **USE THIS ONE**
- JDBC
- Connection pooling
- etc.

### Expected URL Format

The URL in the **"URI"** tab should look like:

```
postgresql://postgres.jgrebihiurfmuhfftsoa:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

OR

```
postgresql://postgres:[PASSWORD]@db.jgrebihiurfmuhfftsoa.supabase.co:5432/postgres
```

## 📋 Complete Steps

1. **Open**: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
2. **Scroll** down to the **"Connection string"** section
3. **Click** on the **"URI"** tab
4. **Copy** the complete URL (it already contains the password)
5. **Paste** in `backend/.env` as `DATABASE_URL=`

## 🔄 Difference Between the Two URLs

| Type | URL | Usage |
|------|-----|-------|
| **REST API** | `https://jgrebihiurfmuhfftsoa.supabase.co` | To use Supabase API (already configured ✅) |
| **PostgreSQL** | `postgresql://postgres:...@...` | For direct PostgreSQL connection (to configure ❌) |

## ✅ After Copying URL

1. Open `backend/.env`
2. Replace the line `DATABASE_URL=...` with the copied URL
3. Test with:
   ```bash
   cd backend
   node src/scripts/find-supabase-url.js
   ```

## 🆘 If You Can't Find the Section

If you don't see the "Connection string" section:

1. Verify you're on **Settings → Database** (not API)
2. The project might be paused → check at the top of the page
3. You might need admin permissions
