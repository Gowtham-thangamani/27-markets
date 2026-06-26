import { Controller, Get, Query, Sse, type MessageEvent } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { interval, map, merge, type Observable } from 'rxjs';
import { MarketService } from './market.service';
import { Public } from '../common/decorators';

/**
 * Public market-data endpoints (display only — no order execution here).
 * Exempt from the global rate limit: these are cheap in-memory reads that the
 * dashboard polls frequently across many instruments.
 */
@SkipThrottle()
@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Public()
  @Get('quotes')
  quotes(@Query('symbols') symbols?: string) {
    const list = (symbols ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? this.market.getQuotes(list) : this.market.getOverview();
  }

  @Public()
  @Get('overview')
  overview() {
    return this.market.getOverview();
  }

  /** Real OHLC candles aggregated from the live tick buffer. */
  @Public()
  @Get('candles')
  candles(@Query('symbol') symbol?: string, @Query('res') res?: string) {
    if (!symbol) return [];
    const bucket = res ? parseInt(res, 10) : 60;
    return this.market.getCandles(symbol, Number.isFinite(bucket) && bucket > 0 ? bucket : 60);
  }

  @Public()
  @Get('health')
  health() {
    return this.market.health();
  }

  /** Real-time price stream (Server-Sent Events). */
  @Public()
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    const quotes = this.market.stream.pipe(
      map((q): MessageEvent => ({ data: JSON.stringify(q) })),
    );
    // heartbeat keeps proxies/load-balancers from dropping an idle connection
    const heartbeat = interval(25_000).pipe(
      map((): MessageEvent => ({ type: 'ping', data: '{}' })),
    );
    return merge(quotes, heartbeat);
  }
}
