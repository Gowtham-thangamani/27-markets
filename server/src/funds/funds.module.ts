import { Module } from '@nestjs/common';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  controllers: [FundsController, CardsController],
  providers: [FundsService, CardsService],
})
export class FundsModule {}
