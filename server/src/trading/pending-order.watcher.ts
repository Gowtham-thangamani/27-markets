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
  private reconcileTimer?: ReturnType<typeof setInterval>;
  /** How often to drift-check the local book against the MT5 venue. */
  private static readonly RECONCILE_MS = 5 * 60 * 1000;
  /** Newest unprocessed price per symbol. */
  private readonly latest = new Map<string, number>();
  /** Symbols with a processing pass currently in flight. */
  private readonly running = new Set<string>();

  constructor(
    private readonly market: MarketService,
    private readonly trading: TradingService,
  ) {}

  onModuleInit(): void {
    this.sub = this.market.stream.subscribe((q) => this.handleTick(q.symbol, q.price));
    this.logger.log('Watching live ticks: pending orders, TP/SL, and stop-out.');
    // Periodic MT5 drift check. A no-op on the simulation venue (reconcileMt5
    // returns null), so it's harmless until the live venue is connected.
    this.reconcileTimer = setInterval(() => {
      void this.trading.reconcileMt5().catch((e) => this.logger.error(`reconciliation failed: ${(e as Error).message}`));
    }, PendingOrderWatcher.RECONCILE_MS);
    this.reconcileTimer.unref?.();
  }

  onModuleDestroy(): void {
    this.sub?.unsubscribe();
    if (this.reconcileTimer) clearInterval(this.reconcileTimer);
  }

  /**
   * Serialize tick processing per symbol so passes never overlap — overlapping
   * passes would double-fill pending orders and double-close positions. While a
   * symbol is being processed, newer ticks only update the latest price; the
   * loop picks up the newest when the current pass finishes (coalescing, so the
   * backlog can't grow). Different symbols still process in parallel.
   */
  handleTick(symbol: string, price: number): void {
    this.latest.set(symbol, price);
    if (this.running.has(symbol)) return;
    void this.drain(symbol);
  }

  private async drain(symbol: string): Promise<void> {
    this.running.add(symbol);
    try {
      while (this.latest.has(symbol)) {
        const price = this.latest.get(symbol) as number;
        this.latest.delete(symbol);
        await this.trading
          .processTick(symbol, price)
          .catch((e) => this.logger.error(`tick processing failed for ${symbol}: ${(e as Error).message}`));
      }
    } finally {
      this.running.delete(symbol);
    }
  }
}
