import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import {
  AML_PROVIDER,
  SimulationAmlProvider,
  ExternalAmlProvider,
  type AmlProvider,
} from './aml-provider';
import { AmlService } from './aml.service';
import { AmlController } from './aml.controller';

/**
 * Chooses the active AML provider:
 *  - AML_PROVIDER=simulation (default) → SimulationAmlProvider (CLEAR, or HIT for
 *    names on AML_SIM_DENYLIST)
 *  - AML_PROVIDER=external → ExternalAmlProvider (fails closed until integrated)
 * Global so funds/kyc can screen + gate without importing this module.
 */
@Global()
@Module({
  controllers: [AmlController],
  providers: [
    AmlService,
    {
      provide: AML_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): AmlProvider =>
        config.get('AML_PROVIDER', { infer: true }) === 'external'
          ? new ExternalAmlProvider(config)
          : new SimulationAmlProvider(config),
    },
  ],
  exports: [AmlService],
})
export class AmlModule {}
