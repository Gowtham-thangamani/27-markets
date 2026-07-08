import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminDataChangeRequestsService } from './admin-data-change-requests.service';
import { RejectWithdrawalDto } from './admin-finance.dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/data-change-requests')
export class AdminDataChangeRequestsController {
  constructor(private readonly requests: AdminDataChangeRequestsService) {}

  @Get()
  list(@Query('status') status?: string) {
    const valid = status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' ? status : undefined;
    return this.requests.list(valid);
  }

  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post(':id/approve')
  approve(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.requests.approve(adminId, id);
  }

  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post(':id/reject')
  reject(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: RejectWithdrawalDto) {
    return this.requests.reject(adminId, id, dto.reason);
  }
}
