import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Set a user as admin by email (without changing password)
 * Usage: node src/scripts/set-user-admin.js <email>
 */
async function setUserAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node src/scripts/set-user-admin.js <email>');
    process.exit(1);
  }

  try {
    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (findError || !user) {
      console.error('❌ User not found:', email);
      process.exit(1);
    }

    // Update user to admin
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, email, role, plan')
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('✅ User updated to admin:', {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      plan: updatedUser.plan
    });

    logger.info('User role updated to admin', { email: updatedUser.email, userId: updatedUser.id });
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user to admin:', error.message);
    logger.error('Error updating user to admin', { error: error.message, email });
    process.exit(1);
  }
}

setUserAdmin();







