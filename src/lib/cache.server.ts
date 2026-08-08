/** Tiny in-memory TTL cache for Worker requests (per isolate). */
type Entry<T> = { exp: number; value: T };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { exp: Date.now() + ttlMs, value });
  // Prevent unbounded growth in long-lived isolates
  if (store.size > 200) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = cacheGet<T>(key);
  if (existing !== undefined) return existing;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 4000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
