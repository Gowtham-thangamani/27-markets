import { toMt5Symbol } from './mt5-symbols';

describe('toMt5Symbol', () => {
  it('maps known symbols and falls back for the rest', () => {
    expect(toMt5Symbol('OANDA:EUR_USD')).toBe('EURUSD');
    expect(toMt5Symbol('OANDA:XAU_USD')).toBe('XAUUSD');
    expect(toMt5Symbol('BINANCE:BTCUSDT')).toBe('BTCUSD');
    expect(toMt5Symbol('AAPL')).toBe('AAPL');
    // fallback: strip venue prefix + separators
    expect(toMt5Symbol('OANDA:GBP_USD')).toBe('GBPUSD');
    expect(toMt5Symbol('BINANCE:SOLUSDT')).toBe('SOLUSDT');
  });
});
