import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Normalize URL – strip trailing /rest/v1 or slashes if someone pasted the REST endpoint by mistake
function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return '';
  let url = raw.trim();
  // Remove common mistakes: /rest/v1, /auth/v1, trailing slash
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

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check Cloudflare Pages environment variables.',
    );
    // Return a client with placeholder values so the app shell still renders;
    // auth calls will fail gracefully instead of crashing the whole page.
    return createClient<Database>(
      SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_ANON_KEY || 'placeholder',
      {
        auth: {
          storage: typeof window !== 'undefined' ? localStorage : undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_ANON_KEY),
    },
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = createSupabaseClient();
