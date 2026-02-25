import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user
 */
export async function registerUser(email, password) {
  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        plan: 'starter', // Default plan
        role: 'user' // Default role
      })
      .select('id, email, plan, role, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    logger.info('User registered successfully', { userId: newUser.id, email: newUser.email });

    // Generate JWT token
    const token = generateToken(newUser.id, newUser.email, newUser.plan, newUser.role);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        plan: newUser.plan,
        role: newUser.role || 'user',
        created_at: newUser.created_at
      },
      token
    };
  } catch (error) {
    logger.error('Error registering user', { error: error.message, email });
    throw error;
  }
}

/**
 * Login user
 */
export async function loginUser(email, password) {
  try {
    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, password_hash, plan, role, created_at')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (findError || !user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.plan, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        role: user.role || 'user',
        created_at: user.created_at
      },
      token
    };
  } catch (error) {
    logger.error('Error logging in user', { error: error.message, email });
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, plan, role, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    logger.error('Error getting user by ID', { error: error.message, userId });
    throw error;
  }
}

/**
 * Generate JWT token
 */
function generateToken(userId, email, plan, role = 'user') {
  return jwt.sign(
    {
      userId,
      email,
      plan,
      role
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
}

