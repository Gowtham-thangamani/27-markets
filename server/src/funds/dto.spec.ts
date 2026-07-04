import 'reflect-metadata';
import { validate } from 'class-validator';
import { CardDepositDto } from './cards.dto';
import { DepositDto, RequestDepositDto } from './dto';

const depositWith = (amount: string) =>
  Object.assign(new DepositDto(), { accountId: 'a', amount, method: 'card' });
const requestWith = (amount: string) =>
  Object.assign(new RequestDepositDto(), { accountId: 'a', amount, method: 'bank' });
const cardWith = (amount: string) =>
  Object.assign(new CardDepositDto(), { accountId: 'a', amount });

const hasMinError = (errors: Awaited<ReturnType<typeof validate>>) =>
  errors.some((e) => e.property === 'amount' && e.constraints?.isMinAmount);

describe('deposit DTOs — server-side $50 minimum (H2)', () => {
  it('rejects a card deposit below $50', async () => {
    expect(hasMinError(await validate(depositWith('10')))).toBe(true);
  });
  it('accepts a card deposit of exactly $50', async () => {
    expect(hasMinError(await validate(depositWith('50')))).toBe(false);
  });
  it('rejects a bank/crypto deposit request below $50', async () => {
    expect(hasMinError(await validate(requestWith('49.99')))).toBe(true);
  });
  it('rejects a saved-card deposit below $50', async () => {
    expect(hasMinError(await validate(cardWith('5')))).toBe(true);
  });
  it('accepts amounts above $50', async () => {
    expect(hasMinError(await validate(cardWith('100')))).toBe(false);
  });
});
