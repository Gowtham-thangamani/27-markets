import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { FundsService } from './funds.service';
import { DepositDto, RequestDepositDto, WithdrawDto, TransferDto } from './dto';
import { CurrentUser } from '../common/decorators';

@Controller('funds')
export class FundsController {
  constructor(private readonly funds: FundsService) {}

  @Get('history')
  history(@CurrentUser('id') userId: string) {
    return this.funds.history(userId);
  }

  @Get('deposit/methods')
  depositMethods() {
    return this.funds.depositMethods();
  }

  @Get('deposit/requests')
  depositRequests(@CurrentUser('id') userId: string) {
    return this.funds.myDepositRequests(userId);
  }

  /** Start a deposit on a chosen rail (card → checkout; bank/crypto → request + instructions). */
  @HttpCode(200)
  @Post('deposit/request')
  requestDeposit(@CurrentUser('id') userId: string, @Body() dto: RequestDepositDto) {
    return this.funds.requestDeposit(userId, dto);
  }

  @HttpCode(200)
  @Post('deposit')
  deposit(@CurrentUser('id') userId: string, @Body() dto: DepositDto) {
    return this.funds.deposit(userId, dto);
  }

  /** Begin a deposit via the PSP — returns a checkout URL (or credits inline in simulation). */
  @HttpCode(200)
  @Post('deposit/checkout')
  depositCheckout(@CurrentUser('id') userId: string, @Body() dto: DepositDto) {
    return this.funds.depositCheckout(userId, dto);
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

  /** Whether the client can receive payouts / needs onboarding. */
  @Get('payout/status')
  payoutStatus(@CurrentUser('id') userId: string) {
    return this.funds.payoutStatus(userId);
  }

  /** Start (or resume) payout onboarding — returns a hosted URL to redirect to. */
  @HttpCode(200)
  @Post('payout/onboarding')
  payoutOnboarding(@CurrentUser('id') userId: string) {
    return this.funds.payoutOnboarding(userId);
  }
}
