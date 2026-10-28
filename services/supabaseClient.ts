import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined)
)?.trim();

// Without Supabase credentials the app runs on the built-in demo data layer (services/demo).
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

export const supabaseUrlOrEmpty = supabaseUrl ?? '';

// For the Supabase implementations, which are only selected when credentials are present.
export const requireSupabase = (): SupabaseClient => {
  if (!supabase) throw new Error('Supabase is not configured (demo mode).');
  return supabase;
};
