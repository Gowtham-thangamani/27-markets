import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

const TIMEOUT_MS = 20_000;

/**
 * MetaApi.cloud provisioning client — links a client's EXISTING MT5 account by
 * its login/password/server and returns a MetaApi account id we then trade
 * through. The password is used once here and never stored.
 * Gated by MT5_PROVISIONING_URL + MT5_API_KEY.
 */
@Injectable()
export class Mt5ProvisioningClient {
  private readonly log = new Logger('Mt5Provisioning');

  constructor(private readonly config: ConfigService<Env, true>) {}

  get baseUrl(): string | undefined {
    return this.config.get('MT5_PROVISIONING_URL', { infer: true });
  }
  get configured(): boolean {
    return !!this.baseUrl && !!this.config.get('MT5_API_KEY', { infer: true });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.baseUrl) throw new ServiceUnavailableException('MT5 provisioning is not configured (MT5_PROVISIONING_URL).');
    const token = this.config.get('MT5_API_KEY', { infer: true });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { 'content-type': 'application/json', ...(token ? { 'auth-token': token } : {}), ...(init?.headers ?? {}) },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new ServiceUnavailableException(`MT5 provisioning error ${res.status}: ${body.slice(0, 200)}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      if ((e as Error).name === 'AbortError') throw new ServiceUnavailableException('MT5 provisioning timed out.');
      this.log.error(`provisioning request failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('MT5 provisioning is unreachable.');
    } finally {
      clearTimeout(timer);
    }
  }

  /** Provision (link) an MT5 account and deploy it. Returns the MetaApi account id. */
  async provisionAccount(input: { login: string; password: string; server: string; name: string }): Promise<{ id: string }> {
    const region = this.config.get('MT5_REGION', { infer: true }) ?? 'new-york';
    const created = await this.request<{ id: string }>('/users/current/accounts', {
      method: 'POST',
      body: JSON.stringify({
        login: input.login,
        password: input.password,
        name: input.name,
        server: input.server,
        platform: 'mt5',
        magic: 0,
        application: 'MetaApi',
        type: 'cloud-g2',
        region,
      }),
    });
    // Kick off deployment (async on MetaApi's side; safe to ignore failures here).
    await this.request(`/users/current/accounts/${created.id}/deploy`, { method: 'POST' }).catch(() => undefined);
    return created;
  }
}
