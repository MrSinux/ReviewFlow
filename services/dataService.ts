import { isDemoMode } from './supabaseClient';
import { supabaseDataService } from './supabase/dataService';
import { demoDataService } from './demo/dataService';
import type { DataService } from './serviceTypes';

// Supabase when VITE_SUPABASE_URL and the anon key are set, otherwise the in-browser demo data.
export const dataService: DataService = isDemoMode ? demoDataService : supabaseDataService;
