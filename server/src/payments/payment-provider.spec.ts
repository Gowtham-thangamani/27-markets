import { SimulationPaymentProvider, UnavailableLivePaymentProvider } from './payment-provider';

describe('SimulationPaymentProvider', () => {
  const p = new SimulationPaymentProvider();
  it('is simulated and always available', () => {
    expect(p.simulated).toBe(true);
    expect(() => p.assertAvailable()).not.toThrow();
  });

  it('credits deposits inline (no checkout url)', async () => {
    expect(await p.createDepositCheckout()).toEqual({ url: null });
  });

  it('returns a simulated payout', async () => {
    const res = await p.payout({ reference: 'TX-1', amountMinor: 100, currency: 'USD' });
    expect(res.simulated).toBe(true);
    expect(res.status).toBe('paid');
  });
});

describe('UnavailableLivePaymentProvider', () => {
  const p = new UnavailableLivePaymentProvider();
  it('is not simulated and refuses to move funds', () => {
    expect(p.simulated).toBe(false);
    expect(() => p.assertAvailable()).toThrow(/LIVE funding is not available/);
  });

  it('refuses payouts', async () => {
    await expect(p.payout({ reference: 'TX-1', amountMinor: 100, currency: 'USD' })).rejects.toThrow(/not available/);
  });
});
