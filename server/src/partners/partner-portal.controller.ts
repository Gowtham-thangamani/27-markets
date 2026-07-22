// server/src/partners/partner-portal.controller.ts
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { PartnerPortalService } from './partner-portal.service';
import { UpdateConversionDto } from './dto/update-conversion.dto';
import { UpdatePayoutMethodDto } from './dto/update-payout-method.dto';

@UseGuards(RolesGuard)
@Roles(UserRole.PARTNER)
@Controller('partner')
export class PartnerPortalController {
  constructor(private readonly portal: PartnerPortalService) {}

  @Get('dashboard')
  dashboard(@CurrentUser('id') userId: string) { return this.portal.dashboard(userId); }

  @Get('clients')
  clients(@CurrentUser('id') userId: string) { return this.portal.clients(userId); }

  @Patch('clients/:id/conversion')
  setConversion(
    @CurrentUser('id') userId: string,
    @Param('id') clientId: string,
    @Body() dto: UpdateConversionDto,
  ) {
    return this.portal.setConversionStatus(userId, clientId, dto.status);
  }

  @Get('sub-partners')
  subPartners(@CurrentUser('id') userId: string) { return this.portal.subPartners(userId); }

  @Get('commissions')
  commissions(
    @CurrentUser('id') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.portal.commissions(userId, { from, to });
  }

  @Get('payouts')
  payouts(@CurrentUser('id') userId: string) { return this.portal.payouts(userId); }

  @HttpCode(200)
  @Post('payouts')
  requestPayout(@CurrentUser('id') userId: string) { return this.portal.requestPayout(userId); }

  @Get('settings')
  settings(@CurrentUser('id') userId: string) { return this.portal.settings(userId); }

  @Patch('settings/payout-method')
  updatePayoutMethod(@CurrentUser('id') userId: string, @Body() dto: UpdatePayoutMethodDto) {
    return this.portal.updatePayoutMethod(userId, dto.method, dto.details);
  }

  @Get('profile')
  profile(@CurrentUser('id') userId: string) { return this.portal.profile(userId); }
}
