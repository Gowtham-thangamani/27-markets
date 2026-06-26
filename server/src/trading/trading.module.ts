import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { MarketModule } from '../market/market.module';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { PendingOrderWatcher } from './pending-order.watcher';
import { Mt5GatewayClient } from './mt5-gateway.client';
import {
  EXECUTION_PROVIDER,
  SimulationExecutionProvider,
  Mt5ExecutionProvider,
  type ExecutionProvider,
} from './execution-provider';

/**
 * Selects the execution venue from EXECUTION_PROVIDER: 'simulation' (default,
 * demo fills at the live price) or 'mt5' (white-label gateway). Both providers
 * are instantiated so the factory can choose at runtime.
 */
@Module({
  imports: [MarketModule],
  controllers: [TradingController],
  providers: [
    TradingService,
    PendingOrderWatcher,
    Mt5GatewayClient,
    SimulationExecutionProvider,
    Mt5ExecutionProvider,
    {
      provide: EXECUTION_PROVIDER,
      inject: [ConfigService, SimulationExecutionProvider, Mt5ExecutionProvider],
      useFactory: (
        config: ConfigService<Env, true>,
        sim: SimulationExecutionProvider,
        mt5: Mt5ExecutionProvider,
      ): ExecutionProvider => (config.get('EXECUTION_PROVIDER', { infer: true }) === 'mt5' ? mt5 : sim),
    },
  ],
})
export class TradingModule {}
