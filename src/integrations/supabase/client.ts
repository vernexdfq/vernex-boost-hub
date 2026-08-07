import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return '';
  let url = raw.trim();
  url = url.replace(/\/(rest|auth|storage|functions)\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

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
 * SECURITY: No persistent login.
 * - Sessions are memory-only (not written to localStorage or sessionStorage)
 * - Closing the tab / refreshing the page requires phone + PIN again
 * - Prevents other people from opening someone else's account on a shared phone
 */
function wipeStoredAuth() {
  if (typeof window === 'undefined') return;
  try {
    const storages = [window.localStorage, window.sessionStorage];
    for (const store of storages) {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i += 1) {
        const k = store.key(i);
        if (
          k &&
          (k.includes('supabase') ||
            k.includes('sb-') ||
            k.startsWith('vernex-auth') ||
            k.includes('auth-token') ||
            k.includes('access_token') ||
            k.includes('refresh_token'))
        ) {
          keys.push(k);
        }
      }
      keys.forEach((k) => store.removeItem(k));
    }
  } catch {
    // private mode / blocked storage
  }
}

// Clear any leftover permanent sessions as soon as the module loads
wipeStoredAuth();

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check Cloudflare Pages environment variables.',
    );
    return createClient<Database>(
      SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_ANON_KEY || 'placeholder',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: undefined,
        },
      },
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_ANON_KEY),
    },
    auth: {
      // Memory-only session — never written to disk
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: undefined,
    },
  });
}

export const supabase = createSupabaseClient();
