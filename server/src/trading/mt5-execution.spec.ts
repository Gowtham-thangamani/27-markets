import { Mt5ExecutionProvider } from './execution-provider';

describe('Mt5ExecutionProvider', () => {
  it('refuses when the gateway is not configured', () => {
    const provider = new Mt5ExecutionProvider({ configured: false } as any);
    expect(() => provider.assertAvailable()).toThrow('not configured');
  });

  it('fills via the gateway and reads the quote when the deal has no price', async () => {
    const gateway = {
      configured: true,
      placeMarketOrder: jest.fn().mockResolvedValue({ positionId: 'p1' }),
      currentPrice: jest.fn().mockResolvedValue({ ask: 60500, bid: 60490 }),
    };
    const provider = new Mt5ExecutionProvider(gateway as any);

    const fill = await provider.fill('BINANCE:BTCUSDT', 'BUY' as any, 0.1);

    expect(gateway.placeMarketOrder).toHaveBeenCalledWith({ symbol: 'BTCUSD', side: 'BUY', volume: 0.1 });
    expect(fill).toEqual({ price: 60500, simulated: false }); // BUY → ask
  });

  it('uses the deal price when the gateway returns one', async () => {
    const gateway = { configured: true, placeMarketOrder: jest.fn().mockResolvedValue({ price: 1.2345 }), currentPrice: jest.fn() };
    const provider = new Mt5ExecutionProvider(gateway as any);

    const fill = await provider.fill('OANDA:EUR_USD', 'SELL' as any, 1);

    expect(fill.price).toBe(1.2345);
    expect(gateway.currentPrice).not.toHaveBeenCalled();
  });

  it('throws when no fill price can be determined', async () => {
    const gateway = { configured: true, placeMarketOrder: jest.fn().mockResolvedValue({}), currentPrice: jest.fn().mockResolvedValue(undefined) };
    const provider = new Mt5ExecutionProvider(gateway as any);
    await expect(provider.fill('X', 'BUY' as any, 1)).rejects.toThrow('fill price unavailable');
  });
});
