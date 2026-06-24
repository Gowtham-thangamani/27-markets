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
});
