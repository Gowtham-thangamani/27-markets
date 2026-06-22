import { Prisma } from '@prisma/client';

/** Decimal alias — all money math goes through this, never `number`. */
export type Money = Prisma.Decimal;
export const Money = Prisma.Decimal;

export const ZERO = new Prisma.Decimal(0);

export function toMoney(value: string | number | Prisma.Decimal): Money {
  return new Prisma.Decimal(value);
}

export function isPositive(value: Money): boolean {
  return value.greaterThan(ZERO);
}

/** Format a Decimal as a 2dp string for API responses. */
export function formatMoney(value: Money): string {
  return value.toFixed(2);
}
