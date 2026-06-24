import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import {
  PAYMENT_PROVIDER,
  SimulationPaymentProvider,
  UnavailableLivePaymentProvider,
  type PaymentProvider,
} from './payment-provider';
import { StripePaymentProvider } from './stripe-payment.provider';
import { PaymentsService } from './payments.service';
import { StripeWebhookController } from './stripe-webhook.controller';

/**
 * Chooses the active payment provider:
 *  - TRADING_MODE=SIMULATION → SimulationPaymentProvider (default; no real money)
 *  - LIVE + PSP_PROVIDER=stripe → StripePaymentProvider
 *  - LIVE + anything else → UnavailableLivePaymentProvider (refuses)
 *
 * StripePaymentProvider is always instantiated (boots safely without keys) so
 * the webhook controller can depend on it regardless of the active provider.
 */
@Global()
@Module({
  controllers: [StripeWebhookController],
  providers: [
    StripePaymentProvider,
    PaymentsService,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, StripePaymentProvider],
      useFactory: (config: ConfigService<Env, true>, stripe: StripePaymentProvider): PaymentProvider => {
        if (config.get('TRADING_MODE', { infer: true }) === 'SIMULATION') {
          return new SimulationPaymentProvider();
        }
        if (config.get('PSP_PROVIDER', { infer: true }) === 'stripe') {
          return stripe;
        }
        return new UnavailableLivePaymentProvider();
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
