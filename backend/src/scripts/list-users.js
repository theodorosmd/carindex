import { supabase } from '../config/supabase.js'
import dotenv from 'dotenv'

dotenv.config()

async function listUsers() {
  try {
    console.log('\n🔍 Listing all users in database...\n')

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, plan, role, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('column') && error.message?.includes('role')) {
        console.error('❌ ERROR: The "role" column does not exist in the users table!')
        console.error('\n📝 Please run this SQL in Supabase SQL Editor first:\n')
        console.error(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin';
UPDATE users SET role = 'user' WHERE role IS NULL;
        `)
        process.exit(1)
      }
      throw error
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in database')
      console.log('\n📝 You need to create a user first by signing up at:')
      console.log('   http://localhost:5173/#/signup\n')
      process.exit(0)
    }

    console.log(`✅ Found ${users.length} user(s):\n`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Plan: ${user.plan || 'N/A'}`)
      console.log(`   Role: ${user.role || '❌ NOT SET'}`)
      console.log(`   Created: ${user.created_at}`)
      console.log('')
    })

    console.log('\n📝 To set admin role for a user, run this SQL in Supabase SQL Editor:')
    console.log(`   UPDATE users SET role = 'admin' WHERE email = 'USER_EMAIL_HERE';\n`)

  } catch (error) {
    console.error('❌ Error listing users:', error.message)
    if (error.message?.includes('relation') && error.message?.includes('users')) {
      console.error('\n⚠️  The users table might not exist. Please run the database schema first.\n')
    }
    process.exit(1)
  }
}

listUsers()







