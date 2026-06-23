import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
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

  @Get('deposits')
  deposits() {
    return this.finance.deposits();
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
