import { isDemoMode } from './supabaseClient';
import { supabaseAuthService } from './supabase/authService';
import { demoAuthService } from './demo/authService';
import type { AuthService } from './serviceTypes';

export type { AuthSession } from './serviceTypes';

// Supabase Auth when VITE_SUPABASE_URL and the anon key are set, otherwise the demo accounts.
export const authService: AuthService = isDemoMode ? demoAuthService : supabaseAuthService;
