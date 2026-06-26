import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

export interface Mt5Deal {
  price: number;
  ticket?: number;
  volume?: number;
}
export interface Mt5Account {
  balance: number;
  equity: number;
  margin: number;
  marginLevel: number;
  currency: string;
}
export interface Mt5Position {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  profit: number;
}

const TIMEOUT_MS = 10_000;

/**
 * Thin HTTP client for an MT5 REST gateway (e.g. MetaApi.cloud, or a self-hosted
 * MT5 Manager/Gateway bridge). The endpoint shapes below are the contract our
 * adapter expects — map them to the chosen provider's API at integration time.
 * All calls require MT5_GATEWAY_URL; auth via MT5_API_KEY, account via MT5_ACCOUNT_ID.
 */
@Injectable()
export class Mt5GatewayClient {
  private readonly log = new Logger('Mt5GatewayClient');

  constructor(private readonly config: ConfigService<Env, true>) {}

  get baseUrl(): string | undefined {
    return this.config.get('MT5_GATEWAY_URL', { infer: true });
  }

  get configured(): boolean {
    return !!this.baseUrl;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const base = this.baseUrl;
    if (!base) throw new ServiceUnavailableException('MT5 gateway is not configured (MT5_GATEWAY_URL).');
    const token = this.config.get('MT5_API_KEY', { infer: true });
    const accountId = this.config.get('MT5_ACCOUNT_ID', { infer: true });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(accountId ? { 'x-mt5-account': accountId } : {}),
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
      if ((e as Error).name === 'AbortError') {
        throw new ServiceUnavailableException('MT5 gateway request timed out.');
      }
      this.log.error(`MT5 gateway request failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('MT5 gateway is unreachable.');
    } finally {
      clearTimeout(timer);
    }
  }

  /** Place a market deal and return the executed price. */
  placeMarketOrder(input: { symbol: string; side: 'BUY' | 'SELL'; volume: number }): Promise<Mt5Deal> {
    return this.request<Mt5Deal>('/orders/market', { method: 'POST', body: JSON.stringify(input) });
  }

  /** Live account state (balance, equity, margin) for reconciliation. */
  getAccount(): Promise<Mt5Account> {
    return this.request<Mt5Account>('/account');
  }

  /** Open positions on the MT5 account. */
  getPositions(): Promise<Mt5Position[]> {
    return this.request<Mt5Position[]>('/positions');
  }

  /** Close an MT5 position by ticket. */
  closePosition(ticket: number): Promise<Mt5Deal> {
    return this.request<Mt5Deal>(`/positions/${ticket}/close`, { method: 'POST' });
  }
}
