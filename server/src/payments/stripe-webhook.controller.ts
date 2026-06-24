import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators';
import { StripePaymentProvider } from './stripe-payment.provider';
import { PaymentsService } from './payments.service';

/**
 * Stripe webhook receiver. Public (no JWT) but authenticated by Stripe's
 * signature over the RAW body — main.ts enables rawBody for this to work.
 */
@Controller('payments/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripe: StripePaymentProvider,
    private readonly payments: PaymentsService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(200)
  @Post('webhook')
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature || !req.rawBody) {
      throw new BadRequestException('Missing Stripe signature or raw body');
    }
    const event = this.stripe.verifyWebhook(req.rawBody, signature);
    return this.payments.handleStripeEvent(event);
  }
}
