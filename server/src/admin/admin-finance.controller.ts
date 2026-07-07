import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JournalStatus, UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { AdminFinanceService } from './admin-finance.service';
import { AdjustmentDto, RejectWithdrawalDto } from './admin-finance.dto';

// Finance is Admin-only (approvals + adjustments move money).
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/finance')
export class AdminFinanceController {
  constructor(private readonly finance: AdminFinanceService) {}

  @Get('withdrawals')
  withdrawals() {
    return this.finance.pendingWithdrawals();
  }

  /** Full withdrawal history, optionally filtered by ?status=PENDING|POSTED|REVERSED. */
  @Get('withdrawals/all')
  allWithdrawals(@Query('status') status?: string) {
    const valid =
      status && (Object.values(JournalStatus) as string[]).includes(status)
        ? (status as JournalStatus)
        : undefined;
    return this.finance.allWithdrawals(valid);
  }

  @Get('deposits')
  deposits() {
    return this.finance.deposits();
  }

  @Get('deposit-requests')
  depositRequests() {
    return this.finance.pendingDepositRequests();
  }

  @HttpCode(200)
  @Post('deposit-requests/:id/approve')
  approveDeposit(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.finance.approveDepositRequest(adminId, id);
  }

  @HttpCode(200)
  @Post('deposit-requests/:id/reject')
  rejectDeposit(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: RejectWithdrawalDto) {
    return this.finance.rejectDepositRequest(adminId, id, dto.reason);
  }

  @HttpCode(200)
  @Post('withdrawals/:id/approve')
  approve(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.finance.approveWithdrawal(adminId, id);
  }

  @HttpCode(200)
  @Post('withdrawals/:id/reject')
  reject(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: RejectWithdrawalDto) {
    return this.finance.rejectWithdrawal(adminId, id, dto.reason);
  }

  @HttpCode(200)
  @Post('adjustments')
  adjust(@CurrentUser('id') adminId: string, @Body() dto: AdjustmentDto) {
    return this.finance.adjust(adminId, dto);
  }
}
