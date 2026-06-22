import { Module } from '@nestjs/common';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  controllers: [FundsController],
  providers: [FundsService],
})
export class FundsModule {}
