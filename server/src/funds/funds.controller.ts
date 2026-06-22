import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { FundsService } from './funds.service';
import { DepositDto, WithdrawDto, TransferDto } from './dto';
import { CurrentUser } from '../common/decorators';

@Controller('funds')
export class FundsController {
  constructor(private readonly funds: FundsService) {}

  @Get('history')
  history(@CurrentUser('id') userId: string) {
    return this.funds.history(userId);
  }

  @HttpCode(200)
  @Post('deposit')
  deposit(@CurrentUser('id') userId: string, @Body() dto: DepositDto) {
    return this.funds.deposit(userId, dto);
  }

  @HttpCode(200)
  @Post('withdraw')
  withdraw(@CurrentUser('id') userId: string, @Body() dto: WithdrawDto) {
    return this.funds.withdraw(userId, dto);
  }

  @HttpCode(200)
  @Post('transfer')
  transfer(@CurrentUser('id') userId: string, @Body() dto: TransferDto) {
    return this.funds.transfer(userId, dto);
  }
}
