import { Controller, Get, Query, Sse, type MessageEvent } from '@nestjs/common';
import { interval, map, merge, type Observable } from 'rxjs';
import { MarketService } from './market.service';
import { Public } from '../common/decorators';

/** Public market-data endpoints (display only — no order execution here). */
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
