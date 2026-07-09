import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { MarketModule } from '../market/market.module';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { PendingOrderWatcher } from './pending-order.watcher';
import { Mt5GatewayClient } from './mt5-gateway.client';
import { Mt5ProvisioningClient } from './mt5-provisioning.client';
import { Mt5ConnectionService } from './mt5-connection.service';
import {
  EXECUTION_PROVIDER,
  SimulationExecutionProvider,
  Mt5ExecutionProvider,
  chooseExecutionProvider,
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
    Mt5ProvisioningClient,
    Mt5ConnectionService,
    SimulationExecutionProvider,
    Mt5ExecutionProvider,
    {
      provide: EXECUTION_PROVIDER,
      inject: [ConfigService, SimulationExecutionProvider, Mt5ExecutionProvider],
      useFactory: (
        config: ConfigService<Env, true>,
        sim: SimulationExecutionProvider,
        mt5: Mt5ExecutionProvider,
      ): ExecutionProvider => {
        const liveRailOn =
          config.get('TRADING_MODE', { infer: true }) === 'LIVE' &&
          config.get('ALLOW_LIVE_MODE', { infer: true }) === true;
        const { provider, fellBack } = chooseExecutionProvider(
          { executionProvider: config.get('EXECUTION_PROVIDER', { infer: true }), liveRailOn },
          sim,
          mt5,
        );
        if (fellBack) {
          new Logger('TradingModule').warn(
            'EXECUTION_PROVIDER=mt5 ignored: the live rail is off (need TRADING_MODE=LIVE and ' +
              'ALLOW_LIVE_MODE=true). Falling back to the simulation venue.',
          );
        }
        return provider;
      },
    },
  ],
})
export class TradingModule {}
