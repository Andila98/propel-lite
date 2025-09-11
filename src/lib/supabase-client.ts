
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
    // This will now only log a warning in the server console instead of crashing.
    console.warn('Supabase URL and Anon Key are not set in environment variables. File uploads will fail.');
}

// Create a single, shared Supabase client for the entire application
// It's safe to initialize even with empty strings; requests will fail gracefully until configured.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
