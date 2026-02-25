import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Setup admin user - adds role column if needed and sets user as admin
 * Usage: node src/scripts/setup-admin-user.js <email>
 */
async function setupAdminUser() {
  const email = process.argv[2] || 'theodore.dignet@gmail.com';

  try {
    console.log('🔍 Looking for user:', email);

    // First, try to find user (case-insensitive search)
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('id, email, role, plan')
      .ilike('email', email);

    if (findError) {
      console.error('❌ Error finding user:', findError.message);
      // Check if error is because role column doesn't exist
      if (findError.message.includes('role') || findError.code === '42703') {
        console.log('⚠️  Role column may not exist. Please run this SQL in Supabase SQL Editor:');
        console.log(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin';
UPDATE users SET role = 'user' WHERE role IS NULL;
        `);
        process.exit(1);
      }
      throw findError;
    }

    if (!users || users.length === 0) {
      console.error('❌ User not found:', email);
      console.log('💡 Please create the user first via signup, then run this script again.');
      process.exit(1);
    }

    const user = users[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      current_role: user.role || 'null',
      plan: user.plan
    });

    // Update user to admin
    const updateData = {
      role: 'admin',
      updated_at: new Date().toISOString()
    };

    // If role column doesn't exist, we'll get an error
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('id, email, role, plan')
      .single();

    if (updateError) {
      if (updateError.message.includes('role') || updateError.code === '42703') {
        console.error('❌ Role column does not exist in database.');
        console.log('\n📝 Please run this SQL in Supabase SQL Editor first:');
        console.log(`
-- Add role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin';

-- Set default for existing users
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Then set this user as admin
UPDATE users SET role = 'admin' WHERE email = '${email.toLowerCase()}';
        `);
        process.exit(1);
      }
      throw updateError;
    }

    console.log('\n✅ User successfully updated to admin:');
    console.log({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      plan: updatedUser.plan
    });

    console.log('\n🎉 You can now login and access the admin dashboard at: #/admin');

    logger.info('User role updated to admin', { email: updatedUser.email, userId: updatedUser.id });
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    logger.error('Error setting user as admin', { error: error.message, email });
    process.exit(1);
  }
}

setupAdminUser();







