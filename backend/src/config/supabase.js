import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let _client = null;

function getSupabase() {
  if (_client) return _client;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Railway Variables (service carindex → Variables tab).'
    );
  }
  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return _client;
}

// Lazy proxy: defers client creation until first use (allows server to start)
export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      return getSupabase()[prop];
    }
  }
);

export async function testSupabaseConnection() {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from('listings')
      .select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true, message: 'Supabase connection successful' };
  } catch (error) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }
}
