import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import { MarketService } from '../market/market.service';
import { TradingService } from './trading.service';

/**
 * Subscribes to the live price stream and fills pending limit/stop orders the
 * moment their trigger is crossed. This is the simulation venue's matching loop;
 * the MT5 adapter would receive fills from the gateway instead.
 */
@Injectable()
export class PendingOrderWatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PendingOrderWatcher');
  private sub?: Subscription;

  constructor(
    private readonly market: MarketService,
    private readonly trading: TradingService,
  ) {}

  onModuleInit(): void {
    this.sub = this.market.stream.subscribe((q) => {
      void this.trading
        .triggerPendingForQuote(q.symbol, q.price)
        .catch((e) => this.logger.error(`trigger failed for ${q.symbol}: ${(e as Error).message}`));
    });
    this.logger.log('Watching live ticks for pending limit/stop orders.');
  }

  onModuleDestroy(): void {
    this.sub?.unsubscribe();
  }
}
