// Auth middleware for server functions — accepts multiple Cloudflare env names.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  let url = raw.trim();
  url = url.replace(/\/(rest|auth|storage|functions)\/v1\/?$/i, "");
  url = url.replace(/\/+$/, "");
  return url;
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function resolveSupabasePublicEnv(): { url: string; key: string } {
  const url = normalizeSupabaseUrl(
    process.env["SUPABASE_URL"] ||
      process.env["VITE_SUPABASE_URL"] ||
      process.env["SUPABASE_PROJECT_URL"] ||
      process.env["VITE_SUPABASE_PROJECT_URL"],
  );
  const key = (
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_ANON_KEY"] ||
    ""
  ).trim();
  return { url, key };
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY } = resolveSupabasePublicEnv();

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const message =
        "Missing Supabase environment variable(s). Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) in Cloudflare Pages.";
      console.error(`[Supabase] ${message}`);
      throw new Error(message);
    }

    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: No authorization header provided");
    }
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }
    if (token.split(".").length !== 3) {
      throw new Error("Unauthorized: Invalid token");
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Prefer getUser (widely supported); fall back to getClaims when available.
    let userId: string | null = null;
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) {
        userId = data.user.id;
      }
    } catch {
      // continue to claims
    }

    if (!userId) {
      try {
        const { data, error } = await supabase.auth.getClaims(token);
        if (!error && data?.claims?.sub) {
          userId = String(data.claims.sub);
        }
      } catch {
        // ignore
      }
    }

    if (!userId) {
      throw new Error("Unauthorized: Invalid token");
    }

    return next({
      context: {
        supabase,
        userId,
        claims: { sub: userId },
      },
    });
  },
);
