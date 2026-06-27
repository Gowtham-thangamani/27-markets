import { Mt5GatewayClient } from './mt5-gateway.client';

const cfg = (vals: Record<string, string>) => ({ get: (k: string) => vals[k] }) as any;
const realFetch = global.fetch;

describe('Mt5GatewayClient (MetaApi)', () => {
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('is not configured without both a URL and an account id', async () => {
    const c = new Mt5GatewayClient(cfg({ MT5_GATEWAY_URL: 'https://gw' }));
    expect(c.configured).toBe(false);
    await expect(c.getAccount()).rejects.toThrow('not configured');
  });

  it('places a market order with the auth-token header on the account path', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ orderId: '1', positionId: 'p1' }) }) as any;
    const c = new Mt5GatewayClient(cfg({ MT5_GATEWAY_URL: 'https://gw/', MT5_API_KEY: 'tok', MT5_ACCOUNT_ID: 'acc-1' }));

    const d = await c.placeMarketOrder({ symbol: 'EURUSD', side: 'BUY', volume: 0.1 });

    expect(d.positionId).toBe('p1');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://gw/users/current/accounts/acc-1/trade');
    expect(init.headers['auth-token']).toBe('tok');
    expect(JSON.parse(init.body)).toEqual({ actionType: 'ORDER_TYPE_BUY', symbol: 'EURUSD', volume: 0.1 });
  });

  it('maps a non-ok response to ServiceUnavailable', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'bad token' }) as any;
    const c = new Mt5GatewayClient(cfg({ MT5_GATEWAY_URL: 'https://gw', MT5_ACCOUNT_ID: 'acc-1' }));
    await expect(c.getAccount()).rejects.toThrow('MT5 gateway error 401');
  });
});
