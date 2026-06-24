import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import {
  PAYMENT_PROVIDER,
  SimulationPaymentProvider,
  UnavailableLivePaymentProvider,
  type PaymentProvider,
} from './payment-provider';

/**
 * Selects the payment provider from TRADING_MODE. SIMULATION → the simulation
 * provider; anything else → the "live unavailable" guard until a real PSP
 * adapter is registered here.
 */
@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): PaymentProvider =>
        config.get('TRADING_MODE', { infer: true }) === 'SIMULATION'
          ? new SimulationPaymentProvider()
          : new UnavailableLivePaymentProvider(),
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
