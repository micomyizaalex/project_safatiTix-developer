import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Using dummy values as we're not actually using Supabase, just our custom backend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createSupabaseClient(
  supabaseUrl,
  supabaseAnonKey
);

export const createClient = createSupabaseClient;
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://backend-v2-wjcs.onrender.com/api' : '/api');
