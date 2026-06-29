/**
 * Test setup. Runs once per worker before test files are loaded.
 *
 * Some Vitest env pools hand out a jsdom window whose
 * `localStorage` is `undefined` (Node 21+ experimental
 * `globalThis.localStorage` shadows jsdom's instance). Inject a
 * tiny in-memory storage on `globalThis.localStorage` (and try
 * `window.localStorage`) so tests can rely on it.
 */

(function installLocalStoragePolyfill() {
  const data = new Map<string, string>();
  const storage = {
    get length() { return data.size; },
    clear() { data.clear(); },
    getItem(key: string) { return data.has(key) ? (data.get(key) as string) : null; },
    key(index: number) { return Array.from(data.keys())[index] ?? null; },
    removeItem(key: string) { data.delete(key); },
    setItem(key: string, value: string) { data.set(key, String(value)); },
  } as Storage;

  if (typeof window !== "undefined") {
    try {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() { return storage; },
      });
    } catch { /* window may be frozen — fall back to globalThis */ }
  }

  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { return storage; },
    });
  } catch { /* ignore */ }
})();

export {};
