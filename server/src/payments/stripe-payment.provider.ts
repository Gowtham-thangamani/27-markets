import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { Env } from '../config/env.validation';
import type { PaymentProvider } from './payment-provider';

export interface DepositCheckoutInput {
  userId: string;
  tradingAccountId: string;
  /** Amount in the currency's smallest unit (e.g. cents). */
  amountMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

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
  async createDepositCheckout(input: DepositCheckoutInput): Promise<{ id: string; url: string | null }> {
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
    return { id: session.id, url: session.url };
  }

  /** Verify + parse an incoming webhook using the signing secret. */
  verifyWebhook(rawBody: Buffer | string, signature: string): Stripe.Event {
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true });
    if (!secret) throw new NotImplementedException('Stripe webhook secret not configured.');
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
