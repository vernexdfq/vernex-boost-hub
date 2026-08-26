import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { AUTH_STORAGE_KEY, createCookieStorage } from '@/lib/session-idle';

function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return '';
  let url = raw.trim();
  url = url.replace(/\/(rest|auth|storage|functions)\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

/**
 * Browser client — prefers VITE_* (build-time), also accepts values injected via vite.config
 * from plain SUPABASE_URL / SUPABASE_ANON_KEY on Northflank.
 */
const SUPABASE_URL = normalizeSupabaseUrl(
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PROJECT_URL as string | undefined),
);

const SUPABASE_ANON_KEY = (
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  ''
).trim();

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/**
 * Persisted auth (cookie + localStorage mirror):
 * - Refresh keeps the user inside the app
 * - Idle > 2 minutes (see session-idle.ts) forces /auth on return
 */
const persistedStorage = createCookieStorage();

function createSupabaseClient() {
  const authOptions = {
    storage: persistedStorage,
    storageKey: AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  } as const;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      '[Supabase] Missing URL or anon key. Set SUPABASE_URL + SUPABASE_ANON_KEY (and/or VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY) on Northflank, then redeploy.',
    );
    return createClient<Database>(
      SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_ANON_KEY || 'placeholder',
      { auth: { ...authOptions, autoRefreshToken: false } },
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_ANON_KEY),
    },
    auth: authOptions,
  });
}

export const supabase = createSupabaseClient();
