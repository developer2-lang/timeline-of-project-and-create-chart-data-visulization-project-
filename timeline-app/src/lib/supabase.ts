import { createClient } from '@supabase/supabase-js';

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export const isSupabaseConfigured = Boolean(
  isValidUrl(rawUrl) && rawKey.length > 10
);

export const supabase =
  isSupabaseConfigured
    ? createClient(rawUrl, rawKey)
    : null;
