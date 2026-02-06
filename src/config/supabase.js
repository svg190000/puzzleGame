import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project credentials
// You can find these in your Supabase dashboard under Settings > API
const SUPABASE_URL = 'https://igszwxfixexkqbvsnxwg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc3p3eGZpeGV4a3FidnNueHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDkwMjgsImV4cCI6MjA4NTkyNTAyOH0.c_P0QM3rog2RpZYGovvH04wTxIH4gJbGvbwV9jUcVjw';

// Export URL for OAuth redirect
export { SUPABASE_URL };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Check if Supabase is configured (compare against placeholders, not real values)
const PLACEHOLDER_URL = 'YOUR_SUPABASE_URL';
const PLACEHOLDER_KEY = 'YOUR_SUPABASE_ANON_KEY';

export const isSupabaseConfigured = () => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    SUPABASE_URL !== PLACEHOLDER_URL &&
    SUPABASE_ANON_KEY !== PLACEHOLDER_KEY
  );
};
