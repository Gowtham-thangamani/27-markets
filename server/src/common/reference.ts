import { randomInt } from 'node:crypto';

/** 8-digit trading account number. Live → leading 2, Demo → leading 9. */
export function generateAccountNumber(mode: 'LIVE' | 'DEMO'): string {
  const lead = mode === 'DEMO' ? 9 : 2;
  const rest = randomInt(1_000_000, 9_999_999);
  return `${lead}${rest}`;
}

/** Human-readable transaction reference, e.g. TX-4831207. */
export function generateTxReference(): string {
  return `TX-${randomInt(1_000_000, 9_999_999)}`;
}
