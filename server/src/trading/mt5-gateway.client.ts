import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

export interface Mt5Deal {
  orderId?: string;
  positionId?: string;
  price?: number;
}
export interface Mt5Account {
  balance: number;
  equity: number;
  margin: number;
  marginLevel: number;
  currency: string;
}
export interface Mt5Position {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  profit: number;
}
export interface Mt5Price {
  ask: number;
  bid: number;
}

const TIMEOUT_MS = 10_000;

/**
 * MetaApi.cloud REST client for MetaTrader 5. MetaApi connects to ANY MT5 account
 * (live or demo) — no white-label server required. Configure:
 *   MT5_GATEWAY_URL = https://mt-client-api-v1.<region>.agiliumtrade.ai
 *   MT5_API_KEY     = MetaApi auth token   (sent as the `auth-token` header)
 *   MT5_ACCOUNT_ID  = the MetaApi account id (provisioned for your MT5 login)
 * Docs: https://metaapi.cloud/docs/client/restApi/
 */
@Injectable()
export class Mt5GatewayClient {
  private readonly log = new Logger('Mt5GatewayClient');

  constructor(private readonly config: ConfigService<Env, true>) {}

  get baseUrl(): string | undefined {
    return this.config.get('MT5_GATEWAY_URL', { infer: true });
  }
  get accountId(): string | undefined {
    return this.config.get('MT5_ACCOUNT_ID', { infer: true });
  }
  get configured(): boolean {
    return !!this.baseUrl && !!this.accountId;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.baseUrl || !this.accountId) {
      throw new ServiceUnavailableException('MT5 gateway is not configured (MT5_GATEWAY_URL + MT5_ACCOUNT_ID).');
    }
    const token = this.config.get('MT5_API_KEY', { infer: true });
    const url = `${this.baseUrl.replace(/\/$/, '')}/users/current/accounts/${this.accountId}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(token ? { 'auth-token': token } : {}),
          ...(init?.headers ?? {}),
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new ServiceUnavailableException(`MT5 gateway error ${res.status}: ${body.slice(0, 200)}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      if ((e as Error).name === 'AbortError') throw new ServiceUnavailableException('MT5 gateway request timed out.');
      this.log.error(`MT5 gateway request failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('MT5 gateway is unreachable.');
    } finally {
      clearTimeout(timer);
    }
  }

  /** Place a market deal (MetaApi trade RPC). */
  placeMarketOrder(input: { symbol: string; side: 'BUY' | 'SELL'; volume: number }): Promise<Mt5Deal> {
    return this.request<Mt5Deal>('/trade', {
      method: 'POST',
      body: JSON.stringify({
        actionType: input.side === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
        symbol: input.symbol,
        volume: input.volume,
      }),
    });
  }

  /** Current ask/bid for a symbol. */
  currentPrice(symbol: string): Promise<Mt5Price> {
    return this.request<Mt5Price>(`/symbols/${encodeURIComponent(symbol)}/current-price`);
  }

  /** Live account state (balance, equity, margin) for reconciliation. */
  getAccount(): Promise<Mt5Account> {
    return this.request<Mt5Account>('/account-information');
  }

  /** Open positions on the MT5 account. */
  getPositions(): Promise<Mt5Position[]> {
    return this.request<Mt5Position[]>('/positions');
  }

  /** Close an MT5 position by id (market close). */
  closePosition(positionId: string): Promise<Mt5Deal> {
    return this.request<Mt5Deal>('/trade', {
      method: 'POST',
      body: JSON.stringify({ actionType: 'POSITION_CLOSE_ID', positionId }),
    });
  }
}
