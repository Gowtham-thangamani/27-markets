import { StripePaymentProvider } from './stripe-payment.provider';

const cfg = (vals: Record<string, unknown>) => ({ get: (k: string) => vals[k] }) as any;

describe('StripePaymentProvider', () => {
  it('is a non-simulated provider named "stripe"', () => {
    const p = new StripePaymentProvider(cfg({}));
    expect(p.name).toBe('stripe');
    expect(p.simulated).toBe(false);
  });

  it('assertAvailable throws when STRIPE_SECRET_KEY is missing', () => {
    const p = new StripePaymentProvider(cfg({}));
    expect(() => p.assertAvailable()).toThrow(/not configured/);
  });

  it('assertAvailable passes when a secret key is configured', () => {
    const p = new StripePaymentProvider(cfg({ STRIPE_SECRET_KEY: 'sk_test_123' }));
    expect(() => p.assertAvailable()).not.toThrow();
  });

  it('createDepositCheckout returns the session url', async () => {
    const p = new StripePaymentProvider(cfg({ STRIPE_SECRET_KEY: 'sk_test_123' }));
    (p as any).client = { checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_1', url: 'https://pay' }) } } };
    const res = await p.createDepositCheckout({ userId: 'u', tradingAccountId: 'a', amountMinor: 1000, currency: 'USD', successUrl: 's', cancelUrl: 'c' });
    expect(res).toEqual({ url: 'https://pay' });
  });

  it('payout creates a Stripe payout and returns its id', async () => {
    const p = new StripePaymentProvider(cfg({ STRIPE_SECRET_KEY: 'sk_test_123' }));
    const create = jest.fn().mockResolvedValue({ id: 'po_1', status: 'pending' });
    (p as any).client = { payouts: { create } };
    const res = await p.payout({ reference: 'TX-1', amountMinor: 5000, currency: 'USD', metadata: {} });
    expect(res).toEqual({ payoutId: 'po_1', status: 'pending', simulated: false });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000, currency: 'usd' }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
  });

  it('payout passes a stable idempotency key from the reference (no double-pay on retry) — M-8', async () => {
    const p = new StripePaymentProvider(cfg({ STRIPE_SECRET_KEY: 'sk_test_123' }));
    const create = jest.fn().mockResolvedValue({ id: 'po_1', status: 'paid' });
    (p as any).client = { payouts: { create } };
    await p.payout({ reference: 'TX-9', amountMinor: 5000, currency: 'USD', metadata: { entryId: 'e1' } });
    const options = create.mock.calls[0][1];
    expect(options).toEqual(expect.objectContaining({ idempotencyKey: expect.stringContaining('TX-9') }));
  });
});
