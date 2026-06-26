import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { Env } from '../config/env.validation';
import type { DepositCheckoutRequest, PaymentProvider, PayoutRequest, PayoutResult } from './payment-provider';

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
   * Pay out an approved withdrawal. Uses Stripe Payouts (platform balance →
   * platform bank). NOTE: paying the END CLIENT directly requires Stripe Connect
   * transfers to their connected/bank account — wire that destination here once
   * onboarding is in place; this is the integration point.
   */
  async payout(req: PayoutRequest): Promise<PayoutResult> {
    this.assertAvailable();
    const p = await this.stripe.payouts.create({
      amount: req.amountMinor,
      currency: req.currency.toLowerCase(),
      metadata: req.metadata,
      statement_descriptor: 'Withdrawal',
    });
    return { payoutId: p.id, status: p.status, simulated: false };
  }

  /** Verify + parse an incoming webhook using the signing secret. */
  verifyWebhook(rawBody: Buffer | string, signature: string): Stripe.Event {
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true });
    if (!secret) throw new NotImplementedException('Stripe webhook secret not configured.');
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
