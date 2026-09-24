import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE_URL = 'xpotential_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'xpotential_supabase_anon_key';

export const DEFAULT_SUPABASE_URL = 'https://hhopbucqowbfsbsvgojx.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_3mZetElcqA85YeHcx400vA_fZfNAybv';

export function getSupabaseUrl(): string {
  try {
    return (
      (import.meta as any).env?.VITE_SUPABASE_URL ||
      localStorage.getItem(STORAGE_KEY_SUPABASE_URL) ||
      DEFAULT_SUPABASE_URL
    );
  } catch {
    return DEFAULT_SUPABASE_URL;
  }
}

export function getSupabaseAnonKey(): string {
  try {
    return (
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) ||
      DEFAULT_SUPABASE_KEY
    );
  } catch {
    return DEFAULT_SUPABASE_KEY;
  }
}

export function setSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, anonKey.trim());
    window.dispatchEvent(new Event('crm-supabase-config-changed'));
  } catch (e) {
    console.error('Failed to save Supabase config to localStorage', e);
  }
}

export function isSupabaseConfigured(): boolean {
  return !!(getSupabaseUrl() && getSupabaseAnonKey());
}

let cachedClient: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) return null;

  if (cachedClient && currentUrl === url && currentKey === key) {
    return cachedClient;
  }

  currentUrl = url;
  currentKey = key;
  cachedClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return cachedClient;
}
