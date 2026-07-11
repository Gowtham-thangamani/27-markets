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

  it('payout transfers to the client connected account with a stable idempotency key (Connect) — M-8', async () => {
    const p = new StripePaymentProvider(cfg({ STRIPE_SECRET_KEY: 'sk_test_123' }));
    const create = jest.fn().mockResolvedValue({ id: 'tr_1' });
    (p as any).client = { transfers: { create } };
    const res = await p.payout({ reference: 'TX-9', amountMinor: 5000, currency: 'USD', destinationAccount: 'acct_1', metadata: { entryId: 'e1' } });
    expect(res).toEqual({ payoutId: 'tr_1', status: 'paid', simulated: false });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000, currency: 'usd', destination: 'acct_1' }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining('TX-9') }),
    );
  });

  it('payout refuses without a connected destination account (no double-pay to platform)', async () => {
    const p = new StripePaymentProvider(cfg({ STRIPE_SECRET_KEY: 'sk_test_123' }));
    (p as any).client = { transfers: { create: jest.fn() } };
    await expect(
      p.payout({ reference: 'TX-2', amountMinor: 5000, currency: 'USD', destinationAccount: null, metadata: {} }),
    ).rejects.toThrow(/connected payout account/);
  });

  it('createPayoutOnboarding creates an Express account + hosted onboarding link', async () => {
    const p = new StripePaymentProvider(cfg({ STRIPE_SECRET_KEY: 'sk_test_123' }));
    const accountsCreate = jest.fn().mockResolvedValue({ id: 'acct_new' });
    const retrieve = jest.fn().mockResolvedValue({ payouts_enabled: false });
    const linkCreate = jest.fn().mockResolvedValue({ url: 'https://connect.stripe/onboard' });
    (p as any).client = { accounts: { create: accountsCreate, retrieve }, accountLinks: { create: linkCreate } };
    const res = await p.createPayoutOnboarding({ userId: 'u', email: 'u@x.io', refreshUrl: 'r', returnUrl: 'ret' });
    expect(res).toEqual({ accountId: 'acct_new', onboardingUrl: 'https://connect.stripe/onboard', payoutsEnabled: false });
    expect(accountsCreate).toHaveBeenCalledWith(expect.objectContaining({ type: 'express', email: 'u@x.io' }));
    expect(linkCreate).toHaveBeenCalledWith(expect.objectContaining({ account: 'acct_new', type: 'account_onboarding' }));
  });

  it('createPayoutOnboarding reuses an existing connected account', async () => {
    const p = new StripePaymentProvider(cfg({ STRIPE_SECRET_KEY: 'sk_test_123' }));
    const accountsCreate = jest.fn();
    const retrieve = jest.fn().mockResolvedValue({ payouts_enabled: true });
    const linkCreate = jest.fn().mockResolvedValue({ url: 'https://link' });
    (p as any).client = { accounts: { create: accountsCreate, retrieve }, accountLinks: { create: linkCreate } };
    const res = await p.createPayoutOnboarding({ userId: 'u', email: 'u@x.io', existingAccountId: 'acct_existing', refreshUrl: 'r', returnUrl: 'ret' });
    expect(accountsCreate).not.toHaveBeenCalled();
    expect(res.accountId).toBe('acct_existing');
    expect(res.payoutsEnabled).toBe(true);
  });
});
