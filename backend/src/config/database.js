// Using Supabase API REST instead of direct PostgreSQL connection
import { supabase } from './supabase.js';

/**
 * Database wrapper for Supabase API
 * Provides a similar interface to pg Pool for easier migration
 */
export const db = {
  /**
   * Execute a query using Supabase API
   * Note: This is a simplified wrapper. Complex queries may need direct Supabase calls.
   */
  async query(sql, params = []) {
    // For simple SELECT queries, we can use Supabase's query builder
    // For complex queries, we'll need to use RPC or direct SQL via Supabase
    throw new Error('Direct SQL queries not supported. Use Supabase client methods instead.');
  },

  /**
   * Get Supabase client for direct access
   */
  get client() {
    return supabase;
  },

  /**
   * Close connection (no-op for Supabase API)
   */
  async end() {
    // No connection to close with API
    return Promise.resolve();
  }
};

// Export supabase client directly for services
export { supabase };



