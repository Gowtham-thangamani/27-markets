import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL auto-cleanup requires a global `afterEach`. With Vitest globals:false we
// must wire it up explicitly so each test starts with a clean DOM.
afterEach(() => cleanup());

// jsdom lacks IntersectionObserver, which scroll-reveal hooks (useInView /
// KpiWidget) depend on. Provide a no-op stub so those components render in tests.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): [] {
    return [];
  }
}
if (!('IntersectionObserver' in globalThis)) {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver;
}

// jsdom lacks matchMedia, used by reduced-motion checks (useCountUp / motion).
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}

// Node 25 ships its own partial `localStorage` global, which shadows jsdom's
// and has no clear()/key() — so `localStorage.clear()` in a beforeEach throws
// "is not a function" and takes the whole spec file down with it. Install a
// complete in-memory implementation on window so tests get the browser API.
if (typeof window !== 'undefined') {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  for (const target of [window, globalThis]) {
    Object.defineProperty(target, 'localStorage', {
      value: shim,
      configurable: true,
      writable: true,
    });
  }
}

// jsdom lacks ResizeObserver, used by recharts ResponsiveContainer.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    MockResizeObserver;
}
