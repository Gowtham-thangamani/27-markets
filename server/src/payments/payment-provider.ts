import { Injectable, NotImplementedException } from '@nestjs/common';

/** DI token for the active payment provider. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface DepositCheckoutRequest {
  userId: string;
  tradingAccountId: string;
  /** Amount in the currency's smallest unit (e.g. cents). */
  amountMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PayoutRequest {
  reference: string;
  amountMinor: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface PayoutResult {
  payoutId: string;
  status: string;
  simulated: boolean;
}

/**
 * The boundary between funding logic and the outside world (PSP / bank).
 * SIMULATION is the default; a licensed PSP adapter (Stripe) plugs in behind
 * this same interface at go-live, so callers never change.
 */
export interface PaymentProvider {
  /** Identifier for diagnostics / audit. */
  readonly name: string;
  /** True when the postings it backs are simulated (no real money). */
  readonly simulated: boolean;
  /** Throws if real funds cannot be moved (no live integration available). */
  assertAvailable(): void;
  /**
   * Start a hosted deposit. Returns a redirect URL, or `null` when the provider
   * credits inline (simulation) and the caller should post the deposit directly.
   */
  createDepositCheckout(req: DepositCheckoutRequest): Promise<{ url: string | null }>;
  /** Send an approved withdrawal payout to the client's destination. */
  payout(req: PayoutRequest): Promise<PayoutResult>;
}

/** Default: SIMULATION — no real funds, always available. */
@Injectable()
export class SimulationPaymentProvider implements PaymentProvider {
  readonly name = 'simulation';
  readonly simulated = true;

  assertAvailable(): void {
    /* simulation is always available */
  }

  async createDepositCheckout(): Promise<{ url: string | null }> {
    return { url: null }; // no redirect — the caller credits the deposit inline
  }

  async payout(req: PayoutRequest): Promise<PayoutResult> {
    return { payoutId: `sim_${req.reference}`, status: 'paid', simulated: true };
  }
}

/**
 * Placeholder for LIVE mode until a licensed PSP/custody provider is wired in.
 * Refuses to move funds — preserves the old assertCanMoveFunds() safety rail.
 */
@Injectable()
export class UnavailableLivePaymentProvider implements PaymentProvider {
  readonly name = 'live-unavailable';
  readonly simulated = false;

  assertAvailable(): void {
    throw new NotImplementedException(
      'LIVE funding is not available: no licensed payment/custody provider is integrated. ' +
        'Operate in SIMULATION until licensing and PSP/bank partners are live.',
    );
  }

  async createDepositCheckout(): Promise<{ url: string | null }> {
    this.assertAvailable();
    return { url: null };
  }

  async payout(_req: PayoutRequest): Promise<PayoutResult> {
    this.assertAvailable();
    return { payoutId: '', status: 'unavailable', simulated: false };
  }
}
