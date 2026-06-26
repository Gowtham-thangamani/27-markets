import { Mt5ExecutionProvider } from './execution-provider';

describe('Mt5ExecutionProvider', () => {
  it('refuses when the gateway is not configured', () => {
    const provider = new Mt5ExecutionProvider({ configured: false } as any);
    expect(() => provider.assertAvailable()).toThrow('not configured');
  });

  it('fills via the gateway using the mapped MT5 symbol', async () => {
    const gateway = { configured: true, placeMarketOrder: jest.fn().mockResolvedValue({ price: 60500, ticket: 1 }) };
    const provider = new Mt5ExecutionProvider(gateway as any);

    const fill = await provider.fill('BINANCE:BTCUSDT', 'BUY' as any, 0.1);

    expect(gateway.placeMarketOrder).toHaveBeenCalledWith({ symbol: 'BTCUSD', side: 'BUY', volume: 0.1 });
    expect(fill).toEqual({ price: 60500, simulated: false });
  });

  it('throws if the gateway returns no price', async () => {
    const gateway = { configured: true, placeMarketOrder: jest.fn().mockResolvedValue({ price: 0 }) };
    const provider = new Mt5ExecutionProvider(gateway as any);
    await expect(provider.fill('X', 'BUY' as any, 1)).rejects.toThrow('no fill price');
  });
});
