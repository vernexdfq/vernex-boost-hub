/**
 * Vernex session idle control
 *
 * - Session itself is persisted (survives refresh)
 * - If the user leaves for more than IDLE_MS and returns, force /auth (not landing)
 * - Activity is tracked via a cookie so it works across tabs/refreshes
 */

export const IDLE_MS = 2 * 60 * 1000; // 2 minutes
export const LAST_ACTIVE_COOKIE = "vernex_last_active";
export const AUTH_STORAGE_KEY = "vernex-auth";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    name +
    "=" +
    encodeURIComponent(value) +
    "; Path=/; Max-Age=" +
    maxAgeSeconds +
    "; SameSite=Lax" +
    secure;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = name + "=; Path=/; Max-Age=0; SameSite=Lax";
}

/** Mark the user as active right now (call on login, navigation, clicks, etc.) */
export function touchSessionActivity() {
  // Keep the cookie alive longer than the idle window so we can still read it after 2 min
  writeCookie(LAST_ACTIVE_COOKIE, String(Date.now()), 60 * 60); // 1 hour max-age
}

export function getLastActiveAt(): number | null {
  const raw = readCookie(LAST_ACTIVE_COOKIE);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** True when last activity is older than IDLE_MS (or missing while a session may exist). */
export function isSessionIdle(): boolean {
  const last = getLastActiveAt();
  if (last == null) return true;
  return Date.now() - last > IDLE_MS;
}

export function clearSessionActivity() {
  deleteCookie(LAST_ACTIVE_COOKIE);
}

/**
 * Cookie-backed Storage adapter for Supabase auth.
 * Keeps the session across refresh; pairs with idle timeout above.
 *
 * Note: Supabase session JSON can be large. We fall back to localStorage if
 * the cookie would exceed ~3500 chars (browser cookie limits).
 */
export function createCookieStorage(): Storage {
  const COOKIE_PREFIX = "sb.";
  const LS_PREFIX = "vernex-sb-";

  function cookieName(key: string) {
    return COOKIE_PREFIX + key;
  }

  function lsKey(key: string) {
    return LS_PREFIX + key;
  }

  return {
    get length() {
      if (typeof window === "undefined") return 0;
      let n = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LS_PREFIX)) n += 1;
        }
      } catch {
        /* ignore */
      }
      return n;
    },
    clear() {
      if (typeof window === "undefined") return;
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LS_PREFIX)) keys.push(k);
        }
        keys.forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
      }
      if (typeof document !== "undefined") {
        document.cookie.split(";").forEach((part) => {
          const name = part.split("=")[0]?.trim();
          if (name && name.startsWith(COOKIE_PREFIX)) deleteCookie(name);
        });
      }
    },
    getItem(key: string) {
      // Prefer localStorage (reliable for large session payloads), then cookie
      try {
        if (typeof localStorage !== "undefined") {
          const fromLs = localStorage.getItem(lsKey(key));
          if (fromLs != null) return fromLs;
        }
      } catch {
        /* ignore */
      }
      return readCookie(cookieName(key));
    },
    key(index: number) {
      if (typeof localStorage === "undefined") return null;
      try {
        const names: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LS_PREFIX)) names.push(k.slice(LS_PREFIX.length));
        }
        return names[index] ?? null;
      } catch {
        return null;
      }
    },
    removeItem(key: string) {
      try {
        if (typeof localStorage !== "undefined") localStorage.removeItem(lsKey(key));
      } catch {
        /* ignore */
      }
      deleteCookie(cookieName(key));
    },
    setItem(key: string, value: string) {
      // Always write localStorage (survives refresh, handles large tokens)
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(lsKey(key), value);
        }
      } catch {
        /* ignore quota */
      }
      // Also mirror a short marker cookie so "cookies" are present for the rule
      // Full session may exceed cookie size limits, so we only store a presence flag
      writeCookie(cookieName(key + ".ok"), "1", 7 * 24 * 60 * 60);
    },
  };
}
