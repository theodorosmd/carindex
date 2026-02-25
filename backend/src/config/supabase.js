import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

// Create Supabase client with service role key (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    return { success: true, message: 'Supabase connection successful' };
  } catch (error) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }
}







