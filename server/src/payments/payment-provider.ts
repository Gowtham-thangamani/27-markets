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
  /** The client's connected/destination account (Stripe Connect). Required by
   * live providers to pay the end client; ignored in simulation. */
  destinationAccount?: string | null;
  metadata?: Record<string, string>;
}

export interface PayoutResult {
  payoutId: string;
  status: string;
  simulated: boolean;
}

export interface PayoutOnboardingRequest {
  userId: string;
  email: string;
  /** ISO-3166-1 alpha-2 country for the connected account (defaults handled by provider). */
  country?: string;
  refreshUrl: string;
  returnUrl: string;
  /** Reuse an existing connected account if the client started onboarding before. */
  existingAccountId?: string | null;
}

export interface PayoutOnboardingResult {
  /** The connected account id (null in simulation — no onboarding needed). */
  accountId: string | null;
  /** Hosted onboarding URL to redirect the client to (null when none needed). */
  onboardingUrl: string | null;
  /** Whether the provider can currently pay out to this account. */
  payoutsEnabled: boolean;
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
  /**
   * Start (or resume) client payout onboarding — e.g. a Stripe Connect account +
   * hosted onboarding link. Simulation needs none, so it returns nulls with
   * payouts already "enabled".
   */
  createPayoutOnboarding(req: PayoutOnboardingRequest): Promise<PayoutOnboardingResult>;
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

  async createPayoutOnboarding(): Promise<PayoutOnboardingResult> {
    // No onboarding in simulation — payouts are always "enabled".
    return { accountId: null, onboardingUrl: null, payoutsEnabled: true };
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

  async createPayoutOnboarding(): Promise<PayoutOnboardingResult> {
    this.assertAvailable();
    return { accountId: null, onboardingUrl: null, payoutsEnabled: false };
  }
}
