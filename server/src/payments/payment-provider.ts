import { Injectable, NotImplementedException } from '@nestjs/common';

/** DI token for the active payment provider. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

/**
 * The boundary between funding logic and the outside world (PSP / bank).
 * Today only a SIMULATION implementation exists; a licensed PSP adapter plugs
 * in behind this same interface at go-live, so FundsService never changes.
 */
export interface PaymentProvider {
  /** Identifier for diagnostics / audit. */
  readonly name: string;
  /** True when the postings it backs are simulated (no real money). */
  readonly simulated: boolean;
  /** Throws if real funds cannot be moved (no live integration available). */
  assertAvailable(): void;
}

/** Default: SIMULATION — no real funds, always available. */
@Injectable()
export class SimulationPaymentProvider implements PaymentProvider {
  readonly name = 'simulation';
  readonly simulated = true;
  assertAvailable(): void {
    /* simulation is always available */
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
}
