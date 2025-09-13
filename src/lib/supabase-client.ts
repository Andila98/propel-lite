
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Use the SERVICE_ROLE_KEY for server-side operations to bypass RLS.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
    // This will now only log a warning in the server console instead of crashing.
    console.warn('Supabase URL and Service Role Key are not set in environment variables. File uploads will fail.');
}

// Create a single, shared Supabase client for the entire application
// It's safe to initialize even with empty strings; requests will fail gracefully until configured.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
