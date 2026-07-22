import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { Env } from '../config/env.validation';
import type {
  CompletedPspDeposit,
  DepositCheckoutRequest,
  PaymentProvider,
  PayoutRequest,
  PayoutResult,
  PayoutOnboardingRequest,
  PayoutOnboardingResult,
} from './payment-provider';

/**
 * Stripe adapter behind the PaymentProvider seam. SKELETON / sandbox-ready:
 * it is only selected when PSP_PROVIDER=stripe and refuses to act without
 * STRIPE_SECRET_KEY. The Stripe client is built lazily so the app boots fine
 * in SIMULATION without any Stripe config.
 */
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';
  readonly simulated = false;
  private client?: Stripe;

  constructor(private readonly config: ConfigService<Env, true>) {}

  private get stripe(): Stripe {
    if (!this.client) {
      const key = this.config.get('STRIPE_SECRET_KEY', { infer: true });
      if (!key) throw new NotImplementedException('Stripe is not configured (STRIPE_SECRET_KEY missing).');
      this.client = new Stripe(key);
    }
    return this.client;
  }

  assertAvailable(): void {
    if (!this.config.get('STRIPE_SECRET_KEY', { infer: true })) {
      throw new NotImplementedException(
        'LIVE funding via Stripe is not configured (STRIPE_SECRET_KEY missing).',
      );
    }
  }

  /** Create a Checkout Session for a deposit. The webhook confirms + credits it. */
  async createDepositCheckout(input: DepositCheckoutRequest): Promise<{ url: string | null }> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountMinor,
            product_data: { name: `Deposit · account ${input.tradingAccountId}` },
          },
        },
      ],
      metadata: { userId: input.userId, tradingAccountId: input.tradingAccountId },
    });
    return { url: session.url };
  }

  /**
   * Pay an approved withdrawal to the CLIENT via Stripe Connect: a Transfer moves
   * platform balance → the client's connected account (which then settles to the
   * client's bank on its payout schedule). Requires the client to have completed
   * payout onboarding (see createPayoutOnboarding).
   */
  async payout(req: PayoutRequest): Promise<PayoutResult> {
    this.assertAvailable();
    if (!req.destinationAccount) {
      throw new NotImplementedException(
        'Cannot pay the client: no connected payout account. The client must complete payout onboarding first.',
      );
    }
    const transfer = await this.stripe.transfers.create(
      {
        amount: req.amountMinor,
        currency: req.currency.toLowerCase(),
        destination: req.destinationAccount,
        metadata: req.metadata,
      },
      // Idempotency key keyed to the withdrawal reference: a retried approval
      // (e.g. after markPosted fails) reuses the same transfer instead of double-paying.
      { idempotencyKey: `payout:${req.reference}` },
    );
    return { payoutId: transfer.id, status: 'paid', simulated: false };
  }

  /**
   * Create (or reuse) an Express connected account for the client and return a
   * hosted onboarding link. Called when the client sets up payouts.
   */
  async createPayoutOnboarding(req: PayoutOnboardingRequest): Promise<PayoutOnboardingResult> {
    this.assertAvailable();
    let accountId = req.existingAccountId ?? null;
    if (!accountId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email: req.email,
        ...(req.country ? { country: req.country } : {}),
        capabilities: { transfers: { requested: true } },
        metadata: { userId: req.userId },
      });
      accountId = account.id;
    }
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: req.refreshUrl,
      return_url: req.returnUrl,
      type: 'account_onboarding',
    });
    const acct = await this.stripe.accounts.retrieve(accountId);
    return { accountId, onboardingUrl: link.url, payoutsEnabled: !!acct.payouts_enabled };
  }

  /**
   * Paid deposit Checkout Sessions since `since`, for ledger reconciliation.
   * Deposit sessions are identified by the metadata this provider stamps at
   * creation (userId + tradingAccountId), so Connect/other sessions are ignored.
   */
  async listCompletedDeposits(since: Date): Promise<CompletedPspDeposit[]> {
    const out: CompletedPspDeposit[] = [];
    const created = { gte: Math.floor(since.getTime() / 1000) };
    let startingAfter: string | undefined;

    // Paginate defensively; 10 pages × 100 is far beyond an hourly window.
    for (let page = 0; page < 10; page++) {
      const batch: Stripe.ApiList<Stripe.Checkout.Session> = await this.stripe.checkout.sessions.list({
        created,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const s of batch.data) {
        if (s.payment_status !== 'paid') continue;
        if (!s.metadata?.userId || !s.metadata?.tradingAccountId) continue; // not a deposit session
        out.push({ id: s.id, amountMinor: s.amount_total ?? 0, created: s.created });
      }
      if (!batch.has_more || batch.data.length === 0) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }
    return out;
  }

  /** Verify + parse an incoming webhook using the signing secret. */
  verifyWebhook(rawBody: Buffer | string, signature: string): Stripe.Event {
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true });
    if (!secret) throw new NotImplementedException('Stripe webhook secret not configured.');
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
