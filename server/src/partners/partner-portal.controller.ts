// server/src/partners/partner-portal.controller.ts
import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { PartnerPortalService } from './partner-portal.service';

@UseGuards(RolesGuard)
@Roles(UserRole.PARTNER)
@Controller('partner')
export class PartnerPortalController {
  constructor(private readonly portal: PartnerPortalService) {}

  @Get('dashboard')
  dashboard(@CurrentUser('id') userId: string) { return this.portal.dashboard(userId); }

  @Get('clients')
  clients(@CurrentUser('id') userId: string) { return this.portal.clients(userId); }

  @Get('commissions')
  commissions(@CurrentUser('id') userId: string) { return this.portal.commissions(userId); }

  @HttpCode(200)
  @Post('payouts')
  requestPayout(@CurrentUser('id') userId: string) { return this.portal.requestPayout(userId); }

  @Get('profile')
  profile(@CurrentUser('id') userId: string) { return this.portal.profile(userId); }
}
