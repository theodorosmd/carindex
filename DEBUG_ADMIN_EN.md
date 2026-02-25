# 🔍 Admin Dashboard Debugging

## Problem
The admin dashboard shows "Loading..." indefinitely.

## Solutions to try

### 1. Check the backend is running

```bash
cd backend
npm run dev
```

The server should run at `http://localhost:3001`

### 2. Verify the JWT token

Most likely issue: **your JWT token does not contain the admin role** because you logged in BEFORE getting the admin role.

**Solution:**
1. **Log out** completely
2. **Log back in** with `theodoredignet@gmail.com`
3. A new token will be generated with the `admin` role

### 3. Check the browser console

1. Open the console (F12)
2. Go to the "Console" tab
3. Reload the page
4. You should see messages like:
   - `📊 Admin stats response status: 200` (success)
   - `❌ Admin stats error: ...` (error)
   - `✅ Admin stats data: ...` (data received)

### 4. Test the endpoint directly

Open the browser console (F12) and run:

```javascript
// Get the token
const token = localStorage.getItem('carindex_token');

// Test the admin endpoint
fetch('/api/v1/admin/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log('✅ Response:', data))
.catch(err => console.error('❌ Error:', err));
```

**Possible results:**

- **Status 200**: API works, issue is in the frontend
- **Status 403**: You do not have the admin role (log in again)
- **Status 401**: Token invalid or expired (log in again)
- **Network error**: Backend is not running

### 5. Check the role in the token

In the browser console:

```javascript
// Decode JWT token (without verification)
const token = localStorage.getItem('carindex_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Role in token:', payload.role);
console.log('Full token payload:', payload);
```

If `payload.role` is not `'admin'`, you must log in again.

### 6. Check the role in the database

```bash
cd backend
node src/scripts/check-user-role.js theodoredignet@gmail.com
```

You should see:
```
Role: admin
```

If not, run the SQL in Supabase (see `SET_ADMIN_NOW.sql`).

---

## Quick fix (recommended)

1. **Run the SQL** in Supabase (see `SET_ADMIN_NOW.sql`)
2. **Log out** of the app
3. **Log back in** with `theodoredignet@gmail.com`
4. **Reload** the admin dashboard (F5)

This will generate a new JWT token with the admin role.
