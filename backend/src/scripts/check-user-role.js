import { supabase } from '../config/supabase.js'
import dotenv from 'dotenv'

dotenv.config()

async function checkUserRole(email) {
  if (!email) {
    console.error('Usage: node src/scripts/check-user-role.js <email>')
    process.exit(1)
  }

  try {
    console.log(`\n🔍 Checking role for: ${email}\n`)

    // Check if role column exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, plan, role, created_at')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('column') && error.message?.includes('role')) {
        console.error('❌ ERROR: The "role" column does not exist in the users table!')
        console.error('\n📝 Please run this SQL in Supabase SQL Editor:\n')
        console.error(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin';
UPDATE users SET role = 'user' WHERE role IS NULL;
UPDATE users SET role = 'admin' WHERE email = '${email}';
        `)
        process.exit(1)
      }
      throw error
    }

    if (!user) {
      console.error(`❌ User not found: ${email}`)
      process.exit(1)
    }

    console.log('✅ User found:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Plan: ${user.plan || 'N/A'}`)
    console.log(`   Role: ${user.role || '❌ NOT SET (defaults to "user")'}`)
    console.log(`   Created: ${user.created_at}`)

    if (!user.role || user.role === 'user') {
      console.log('\n⚠️  User does not have admin role!')
      console.log('\n📝 To set admin role, run this SQL in Supabase SQL Editor:\n')
      console.log(`UPDATE users SET role = 'admin' WHERE email = '${email}';`)
      console.log('\nThen reconnect to the application.\n')
    } else if (user.role === 'admin') {
      console.log('\n✅ User has admin role!')
      console.log('   If you are still seeing the regular dashboard, try:')
      console.log('   1. Disconnect and reconnect')
      console.log('   2. Clear browser cache')
      console.log('   3. Check browser console for errors\n')
    }

  } catch (error) {
    console.error('❌ Error checking user role:', error.message)
    process.exit(1)
  }
}

checkUserRole(process.argv[2])







