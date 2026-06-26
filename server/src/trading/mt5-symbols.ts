// Maps our market-data symbols (Finnhub/Binance style) to MetaTrader 5 symbols.
// MT5 brokers use bare tickers (EURUSD, XAUUSD, BTCUSD). Extend per broker's
// symbol list — some append suffixes (e.g. EURUSD.r, BTCUSD.m).
const TO_MT5: Record<string, string> = {
  'BINANCE:BTCUSDT': 'BTCUSD',
  'BINANCE:ETHUSDT': 'ETHUSD',
  'OANDA:EUR_USD': 'EURUSD',
  'OANDA:XAU_USD': 'XAUUSD',
  AAPL: 'AAPL',
  TSLA: 'TSLA',
};

/** Our symbol → MT5 symbol. Falls back to stripping the venue prefix/separators. */
export function toMt5Symbol(symbol: string): string {
  const mapped = TO_MT5[symbol];
  if (mapped) return mapped;
  const bare = symbol.includes(':') ? symbol.split(':')[1] : symbol;
  return bare.replace(/[_/-]/g, '').toUpperCase();
}

export const MT5_SYMBOL_MAP = TO_MT5;
