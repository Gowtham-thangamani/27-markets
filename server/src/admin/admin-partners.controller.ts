import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminPartnersService } from './admin-partners.service';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/partners')
export class AdminPartnersController {
  constructor(private readonly partners: AdminPartnersService) {}

  @Get()
  list() {
    return this.partners.listPartners();
  }

  @Get(':id/commissions')
  commissions(@Param('id') id: string) {
    return this.partners.partnerCommissions(id);
  }

  @Get('payouts/pending')
  pendingPayouts() {
    return this.partners.listPartnerPayouts();
  }

  // Money movement — ADMIN only.
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post('payouts/:id/approve')
  approvePayout(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.partners.approvePartnerPayout(adminId, id);
  }

  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post('payouts/:id/reject')
  rejectPayout(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.partners.rejectPartnerPayout(adminId, id, reason);
  }
}
