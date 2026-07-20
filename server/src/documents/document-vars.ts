import { extractTokens } from '../common/tokens';

/** Tokens resolvable from the client record alone. */
export const CLIENT_TOKENS = ['clientName', 'clientEmail', 'date'] as const;

/** Tokens that require a specific trading account to resolve. */
export const ACCOUNT_TOKENS = ['accountNumber', 'balance', 'currency'] as const;

/** Every token the server resolves itself; anything else is admin-supplied. */
export const AUTO_TOKENS: readonly string[] = [...CLIENT_TOKENS, ...ACCOUNT_TOKENS];

/** True when the body references a token that only an account can resolve. */
export function needsAccount(body: string): boolean {
  const accountTokens: readonly string[] = ACCOUNT_TOKENS;
  return extractTokens(body).some((t) => accountTokens.includes(t));
}

/** Tokens the admin must fill in, because the server cannot resolve them. */
export function manualTokens(body: string): string[] {
  return extractTokens(body).filter((t) => !AUTO_TOKENS.includes(t));
}

/** Filename-safe slug for a template name. Never empty. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'document';
}
