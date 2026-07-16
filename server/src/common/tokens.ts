/**
 * `{{token}}` placeholder handling, shared by email copy and PDF documents so
 * the two cannot drift apart.
 *
 * A fresh RegExp is built per call: a module-level /g regex carries `lastIndex`
 * between calls and would silently skip matches on every other invocation.
 */
const TOKEN_PATTERN = String.raw`\{\{(\w+)\}\}`;

/** Every distinct token name appearing in `text`, in first-seen order. */
export function extractTokens(text: string): string[] {
  const matches = Array.from(text.matchAll(new RegExp(TOKEN_PATTERN, 'g')), (m) => m[1]);
  return [...new Set(matches)];
}

/** Replace each `{{token}}` with `vars[token]`; unknown tokens render empty. */
export function substituteTokens(text: string, vars: Record<string, string>): string {
  return text.replace(new RegExp(TOKEN_PATTERN, 'g'), (_, key: string) => vars[key] ?? '');
}
