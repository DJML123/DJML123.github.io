import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True once real Supabase credentials are configured (see .env.example). */
export function isBackendConfigured(): boolean {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;
}

let client: SupabaseClient | null = null;

/** Lazy singleton; null while the backend is not configured, so the whole app
 *  keeps working fully local. The anon key is public by design (RLS protects
 *  the data), it must never be replaced by the service_role key. */
export function getSupabase(): SupabaseClient | null {
  if (!isBackendConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: AsyncStorage,
      },
    });
  }
  return client;
}
