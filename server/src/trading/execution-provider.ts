import { BadRequestException, Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OrderSide } from '@prisma/client';
import { MarketService } from '../market/market.service';
import type { Env } from '../config/env.validation';

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
 * MetaTrader 5 white-label adapter (SKELETON). Routes real orders to the MT5
 * gateway once a licensed server + credentials are configured. Until then it
 * refuses — real trades must not execute without the venue.
 */
@Injectable()
export class Mt5ExecutionProvider implements ExecutionProvider {
  readonly name = 'mt5';
  readonly simulated = false;

  constructor(private readonly config: ConfigService<Env, true>) {}

  assertAvailable(): void {
    if (!this.config.get('MT5_GATEWAY_URL', { infer: true })) {
      throw new NotImplementedException(
        'MT5 execution is not configured (MT5_GATEWAY_URL missing). Connect a licensed ' +
          'MetaTrader 5 white-label gateway before enabling live trading.',
      );
    }
  }

  async fill(): Promise<Fill> {
    // TODO(go-live): POST the order to the MT5 gateway and return the real fill.
    throw new NotImplementedException(
      'MT5 execution adapter is not implemented yet — connect the MT5 white-label gateway.',
    );
  }
}
