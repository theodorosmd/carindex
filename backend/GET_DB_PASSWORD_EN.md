# 🔑 Get Database Password

## ⚠️ Important Difference

The secret you provided (`[YOUR_SERVICE_ROLE_KEY]`) appears to be a **service role key** or an **API secret**, **NOT** the PostgreSQL database password.

## 🎯 How to Get the Real Password

### Option 1: Reset Password

1. Go to: https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/settings/database
2. **"Database password"** section
3. Click **"Reset database password"**
4. **Copy the new password** (it will only be displayed once!)
5. Use this password to build the URL

### Option 2: Check if Password is Already Visible

On the Database Settings page, look for:
- A **"Database password"** field with a **"Show"** or **"Reveal"** button
- Or a field that displays the password (masked with dots)

## 📝 URL Format with Real Password

Once you have the password, the URL should be:

```
postgresql://postgres.jgrebihiurfmuhfftsoa:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important**: Encode the password if necessary (`@` → `%40`, `+` → `%2B`, etc.)

## 🧪 Quick Test

Once you have the password, test with:

```bash
cd backend
node src/scripts/build-supabase-url.js
```

The script will ask for the password and test automatically.

## 🔄 Alternative: Use Supabase API

If direct PostgreSQL connection continues to be problematic, we can modify the code to use Supabase REST API instead of direct PostgreSQL.

You already have:
- ✅ `SUPABASE_URL`: https://jgrebihiurfmuhfftsoa.supabase.co
- ✅ `SUPABASE_SERVICE_ROLE_KEY`: (already in .env)

This would require replacing direct SQL queries with Supabase REST API calls.
