/**
 * Resolve a public asset path against Vite's base URL.
 * Dev → "/logo.png"; GitHub Pages build → "/27-markets/logo.png".
 */
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\/+/, '')
}
