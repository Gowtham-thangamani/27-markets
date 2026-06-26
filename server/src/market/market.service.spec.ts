import { MarketService } from './market.service';

describe('MarketService.getCandles', () => {
  it('aggregates buffered ticks into OHLC buckets', () => {
    const service = new MarketService({ get: () => undefined } as any);
    // Seed the private tick buffer directly.
    (service as any).history.set('SYM', [
      { t: 0, p: 10 },
      { t: 10_000, p: 12 }, // same 60s bucket as t=0
      { t: 20_000, p: 8 },
      { t: 65_000, p: 9 }, // next bucket
      { t: 70_000, p: 11 },
    ])

    const candles = service.getCandles('SYM', 60, 10)

    expect(candles).toHaveLength(2)
    expect(candles[0]).toEqual({ time: 0, open: 10, high: 12, low: 8, close: 8 })
    expect(candles[1]).toEqual({ time: 60, open: 9, high: 11, low: 9, close: 11 })
  })

  it('returns [] for an unknown symbol', () => {
    const service = new MarketService({ get: () => undefined } as any)
    expect(service.getCandles('NOPE')).toEqual([])
  })
})
