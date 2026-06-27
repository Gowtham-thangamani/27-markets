import {
  BadRequestException,
  Injectable,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OrderSide } from '@prisma/client';
import { MarketService } from '../market/market.service';
import { Mt5GatewayClient } from './mt5-gateway.client';
import { toMt5Symbol } from './mt5-symbols';

/** DI token for the active execution backend. */
export const EXECUTION_PROVIDER = Symbol('EXECUTION_PROVIDER');

export interface Fill {
  price: number;
  simulated: boolean;
}

/**
 * The boundary between the trading app and an execution venue. Today only the
 * SIMULATION venue exists (fills at the live market price). At go-live an MT5
 * white-label adapter plugs in behind this same interface — TradingService
 * never changes.
 */
export interface ExecutionProvider {
  readonly name: string;
  readonly simulated: boolean;
  /** Throws if real execution can't be performed (no venue configured). */
  assertAvailable(): void;
  /** Market fill for a symbol/side/quantity. */
  fill(symbol: string, side: OrderSide, quantity: number): Promise<Fill>;
}

/** Demo execution: fills at the real, live market price from the price feed. */
@Injectable()
export class SimulationExecutionProvider implements ExecutionProvider {
  readonly name = 'simulation';
  readonly simulated = true;

  constructor(private readonly market: MarketService) {}

  assertAvailable(): void {
    /* always available */
  }

  async fill(symbol: string): Promise<Fill> {
    const [q] = await this.market.getQuotes([symbol]);
    if (!q || !(q.price > 0)) {
      throw new BadRequestException(`No live price available for ${symbol}`);
    }
    return { price: q.price, simulated: true };
  }
}

/**
 * MetaTrader 5 adapter (via MetaApi.cloud). Routes real market orders to the
 * configured MT5 account and returns the executed price. Inactive until the
 * gateway is configured — real trades must never execute without a venue.
 */
@Injectable()
export class Mt5ExecutionProvider implements ExecutionProvider {
  readonly name = 'mt5';
  readonly simulated = false;

  constructor(private readonly gateway: Mt5GatewayClient) {}

  assertAvailable(): void {
    if (!this.gateway.configured) {
      throw new NotImplementedException(
        'MT5 execution is not configured (MT5_GATEWAY_URL + MT5_ACCOUNT_ID). Connect a ' +
          'MetaTrader 5 account (e.g. via MetaApi.cloud) before enabling live trading.',
      );
    }
  }

  async fill(symbol: string, side: OrderSide, quantity: number): Promise<Fill> {
    this.assertAvailable();
    const mt5Symbol = toMt5Symbol(symbol);
    const deal = await this.gateway.placeMarketOrder({ symbol: mt5Symbol, side: side as 'BUY' | 'SELL', volume: quantity });

    // The trade RPC confirms execution but not always the price — read the quote.
    let price = deal?.price && deal.price > 0 ? deal.price : undefined;
    if (price === undefined) {
      const quote = await this.gateway.currentPrice(mt5Symbol).catch(() => undefined);
      price = quote ? (side === OrderSide.BUY ? quote.ask : quote.bid) : undefined;
    }
    if (!price || !(price > 0)) {
      throw new ServiceUnavailableException(`MT5 fill price unavailable for ${symbol}.`);
    }
    return { price, simulated: false };
  }
}
