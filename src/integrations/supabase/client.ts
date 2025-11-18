// Supabase client configuration for Lovable environment
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Do not use VITE_ env vars in Lovable. Use full URL and anon key.
const SUPABASE_URL = "https://fisljlameaewzwndwpsq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc2xqbGFtZWFld3p3bmR3cHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzYwMzAsImV4cCI6MjA3NTg1MjAzMH0.mN0tkoMpmWYCug4tD6Zo19Wfy5eSAafgXmvWZFOUvXM";

// Validate Supabase configuration
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn("Missing Supabase environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});