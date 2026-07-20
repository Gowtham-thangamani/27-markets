import { manualTokens, needsAccount, slugify } from './document-vars';

// The two bodies seeded by server/prisma/seed.ts.
const STATEMENT = 'Statement for {{clientName}} — period {{period}}.\nBalance: {{balance}}';
const RECEIPT = 'Receipt for deposit of {{amount}} by {{clientName}} on {{date}}.';

describe('needsAccount', () => {
  it('is true when the body uses an account-scoped token', () => {
    expect(needsAccount(STATEMENT)).toBe(true); // {{balance}}
  });

  it('is false when the body uses only client-scoped tokens', () => {
    expect(needsAccount(RECEIPT)).toBe(false);
  });

  it('is false for a body with no tokens at all', () => {
    expect(needsAccount('Plain text.')).toBe(false);
  });
});

describe('manualTokens', () => {
  it('returns only the tokens the server cannot resolve', () => {
    expect(manualTokens(STATEMENT)).toEqual(['period']);
    expect(manualTokens(RECEIPT)).toEqual(['amount']);
  });

  it('returns an empty array when every token is auto-resolved', () => {
    expect(manualTokens('Hi {{clientName}} on {{date}}')).toEqual([]);
  });
});

describe('slugify', () => {
  it('makes a filename-safe slug', () => {
    expect(slugify('Account Statement')).toBe('account-statement');
    expect(slugify('Deposit  Receipt!')).toBe('deposit-receipt');
  });

  it('never returns an empty slug', () => {
    expect(slugify('!!!')).toBe('document');
  });
});
