import { Injectable, Logger, NotImplementedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { Env } from '../config/env.validation';

/** DI token for the active KYC (identity verification) provider. */
export const KYC_PROVIDER = Symbol('KYC_PROVIDER');

export interface KycVerificationSubject {
  userId: string;
  email: string;
  fullName: string;
  returnUrl: string;
}

export interface KycVerificationSession {
  provider: string;
  reference: string | null;
  /** Hosted IDV flow to redirect to; null in manual mode (upload flow instead). */
  url: string | null;
  /** SDK access token (SumSub WebSDK); the portal launches the flow with it. */
  sdkToken?: string | null;
}

/**
 * The boundary between KYC logic and an identity-verification service. 'manual'
 * (default) means staff document review — no hosted session. An external IDV
 * adapter (Onfido/Sumsub/…) plugs in behind this same interface at go-live.
 */
export interface KycProvider {
  readonly name: string;
  createVerificationSession(subject: KycVerificationSubject): Promise<KycVerificationSession>;
}

/** Default: MANUAL staff review — no hosted session. */
@Injectable()
export class ManualKycProvider implements KycProvider {
  readonly name = 'manual';
  async createVerificationSession(): Promise<KycVerificationSession> {
    return { provider: this.name, reference: null, url: null };
  }
}

const KYC_TIMEOUT_MS = 15_000;
const SUMSUB_DEFAULT_BASE = 'https://api.sumsub.com';

/**
 * SumSub adapter. Creates (or reuses) an applicant keyed by our userId, then
 * issues a WebSDK access token the portal launches the verification flow with.
 * The verdict arrives asynchronously via the SumSub webhook (see
 * KycVerificationService.applySumsubVerdict). All requests are HMAC-signed per
 * SumSub's scheme. Fail-closed: a missing key/secret or an unreachable API
 * raises rather than silently issuing a session.
 */
@Injectable()
export class ExternalKycProvider implements KycProvider {
  readonly name = 'external';
  private readonly log = new Logger('ExternalKycProvider');

  constructor(private readonly config: ConfigService<Env, true>) {}

  async createVerificationSession(subject: KycVerificationSubject): Promise<KycVerificationSession> {
    const token = this.config.get('KYC_PROVIDER_API_KEY', { infer: true });
    const secret = this.config.get('KYC_PROVIDER_SECRET', { infer: true });
    if (!token || !secret) {
      throw new NotImplementedException(
        'KYC provider is not configured (KYC_PROVIDER_API_KEY + KYC_PROVIDER_SECRET missing).',
      );
    }
    const level = this.config.get('KYC_PROVIDER_LEVEL', { infer: true });

    // Create the applicant (idempotent on externalUserId); reuse it on 409.
    let applicantId: string;
    try {
      const created = await this.signedRequest<{ id: string }>(
        'POST',
        `/resources/applicants?levelName=${encodeURIComponent(level)}`,
        { externalUserId: subject.userId, email: subject.email },
      );
      applicantId = created.id;
    } catch (e) {
      if (e instanceof AlreadyExists) {
        const existing = await this.signedRequest<{ id: string }>(
          'GET',
          `/resources/applicants/-/externalUserId/${encodeURIComponent(subject.userId)}/one`,
        );
        applicantId = existing.id;
      } else {
        throw e;
      }
    }

    const { token: sdkToken } = await this.signedRequest<{ token: string }>(
      'POST',
      `/resources/accessTokens?userId=${encodeURIComponent(subject.userId)}&levelName=${encodeURIComponent(level)}`,
    );

    // SumSub is SDK-launched, not a redirect; the portal opens the WebSDK with
    // sdkToken. reference = applicantId correlates the later webhook verdict.
    return { provider: this.name, reference: applicantId, url: null, sdkToken };
  }

  /** An HMAC-signed SumSub API call. */
  private async signedRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = this.config.get('KYC_PROVIDER_API_KEY', { infer: true })!;
    const secret = this.config.get('KYC_PROVIDER_SECRET', { infer: true })!;
    const baseUrl = (this.config.get('KYC_PROVIDER_BASE_URL', { infer: true }) || SUMSUB_DEFAULT_BASE).replace(/\/$/, '');
    const ts = Math.floor(Date.now() / 1000).toString();
    const payload = body === undefined ? '' : JSON.stringify(body);
    // SumSub signature: HMAC-SHA256(secret, ts + METHOD + path + body).
    const sig = createHmac('sha256', secret).update(ts + method + path + payload).digest('hex');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), KYC_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'X-App-Token': token,
          'X-App-Access-Ts': ts,
          'X-App-Access-Sig': sig,
        },
        ...(payload ? { body: payload } : {}),
      });
      if (res.status === 409) throw new AlreadyExists();
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        this.log.error(`SumSub error ${res.status}: ${detail.slice(0, 300)}`);
        throw new ServiceUnavailableException(`KYC provider error (${res.status}).`);
      }
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof AlreadyExists || e instanceof ServiceUnavailableException) throw e;
      if ((e as Error).name === 'AbortError') throw new ServiceUnavailableException('KYC provider timed out.');
      this.log.error(`SumSub request failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('KYC provider is unreachable.');
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Internal sentinel: applicant already exists (SumSub 409). */
class AlreadyExists extends Error {}
