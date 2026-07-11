import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

/** LIVE skeleton: refuses until a real IDV provider is integrated + keyed. */
@Injectable()
export class ExternalKycProvider implements KycProvider {
  readonly name = 'external';
  constructor(private readonly config: ConfigService<Env, true>) {}

  async createVerificationSession(_subject: KycVerificationSubject): Promise<KycVerificationSession> {
    if (!this.config.get('KYC_PROVIDER_API_KEY', { infer: true })) {
      throw new NotImplementedException(
        'KYC provider is not configured (KYC_PROVIDER_API_KEY missing).',
      );
    }
    // Integration point: create a verification session with the IDV provider,
    // return its hosted URL + reference, and handle its webhook to ingest the
    // verdict. Left unimplemented until a vendor is chosen.
    throw new NotImplementedException('External KYC provider adapter is not implemented yet.');
  }
}
