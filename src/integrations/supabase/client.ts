import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

if (!SUPABASE_URL) {
    console.error('Missing VITE_SUPABASE_URL environment variable. Check your .env file.');
}
if (!SUPABASE_PUBLISHABLE_KEY) {
    console.error('Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable. Check your .env file.');
}

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = createClient<Database>(
    SUPABASE_URL || 'https://placeholder.supabase.co',
    SUPABASE_PUBLISHABLE_KEY || 'placeholder'
);
