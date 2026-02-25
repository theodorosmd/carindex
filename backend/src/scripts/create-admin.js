import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Create an admin user
 * Usage: node src/scripts/create-admin.js <email> <password>
 */
async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node src/scripts/create-admin.js <email> <password>');
    process.exit(1);
  }

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      // Update existing user to admin
      const passwordHash = await bcrypt.hash(password, 10);
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select('id, email, role')
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log('✅ User updated to admin:', {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      });
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(password, 10);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          plan: 'plus',
          role: 'admin'
        })
        .select('id, email, plan, role')
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log('✅ Admin user created:', {
        id: newUser.id,
        email: newUser.email,
        plan: newUser.plan,
        role: newUser.role
      });
    }

    logger.info('Admin user created/updated', { email });
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    logger.error('Error creating admin user', { error: error.message, email });
    process.exit(1);
  }
}

createAdmin();







