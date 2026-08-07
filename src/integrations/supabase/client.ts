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
 * In-memory auth storage only.
 * - Login is kept while the user navigates inside the open tab
 * - Refresh / close tab / new visit = must enter phone + PIN again
 * - Nothing is written to localStorage or sessionStorage (shared-phone safe)
 */
function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

const memoryStorage = createMemoryStorage();

// One-time cleanup of any old disk-based sessions so accounts cannot stay open
if (typeof window !== 'undefined') {
  try {
    for (const store of [window.localStorage, window.sessionStorage]) {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i += 1) {
        const k = store.key(i);
        if (
          k &&
          (k.includes('supabase') ||
            k.includes('sb-') ||
            k.startsWith('vernex-auth') ||
            k.includes('auth-token'))
        ) {
          keys.push(k);
        }
      }
      keys.forEach((k) => store.removeItem(k));
    }
  } catch {
    // ignore
  }
}

function createSupabaseClient() {
  const authOptions = {
    storage: memoryStorage,
    storageKey: 'vernex-auth-memory',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  } as const;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check Cloudflare Pages environment variables.',
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
