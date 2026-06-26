import { Mt5GatewayClient } from './mt5-gateway.client';

const cfg = (vals: Record<string, string>) => ({ get: (k: string) => vals[k] }) as any;
const realFetch = global.fetch;

describe('Mt5GatewayClient', () => {
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('reports not configured and refuses calls without a gateway URL', async () => {
    const c = new Mt5GatewayClient(cfg({}));
    expect(c.configured).toBe(false);
    await expect(c.getAccount()).rejects.toThrow('not configured');
  });

  it('places a market order with auth headers and returns the deal', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ price: 1.2345, ticket: 99, volume: 1 }) }) as any;
    const c = new Mt5GatewayClient(cfg({ MT5_GATEWAY_URL: 'https://gw.test/', MT5_API_KEY: 'k', MT5_ACCOUNT_ID: 'a' }));

    const deal = await c.placeMarketOrder({ symbol: 'EURUSD', side: 'BUY', volume: 1 });

    expect(deal.price).toBe(1.2345);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://gw.test/orders/market'); // trailing slash trimmed
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer k');
    expect(init.headers['x-mt5-account']).toBe('a');
    expect(JSON.parse(init.body)).toEqual({ symbol: 'EURUSD', side: 'BUY', volume: 1 });
  });

  it('maps a non-ok response to ServiceUnavailable', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' }) as any;
    const c = new Mt5GatewayClient(cfg({ MT5_GATEWAY_URL: 'https://gw.test' }));
    await expect(c.getAccount()).rejects.toThrow('MT5 gateway error 500');
  });
});
