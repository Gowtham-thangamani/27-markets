import { SimulationPaymentProvider, UnavailableLivePaymentProvider } from './payment-provider';

describe('SimulationPaymentProvider', () => {
  const p = new SimulationPaymentProvider();
  it('is simulated and always available', () => {
    expect(p.simulated).toBe(true);
    expect(() => p.assertAvailable()).not.toThrow();
  });
});

describe('UnavailableLivePaymentProvider', () => {
  const p = new UnavailableLivePaymentProvider();
  it('is not simulated and refuses to move funds', () => {
    expect(p.simulated).toBe(false);
    expect(() => p.assertAvailable()).toThrow(/LIVE funding is not available/);
  });
});
