import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PartnerApplicationStatus, UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { PartnersService } from './partners.service';
import { RejectApplicationDto } from './dto';

@UseGuards(RolesGuard)
@Controller('admin/partner-applications')
export class AdminPartnerApplicationsController {
  constructor(private readonly partners: PartnersService) {}

  @Roles(...STAFF_ROLES)
  @Get()
  list(@Query('status') status?: PartnerApplicationStatus) {
    return this.partners.listApplications(status);
  }

  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post(':id/approve')
  approve(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.partners.approve(adminId, id);
  }

  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post(':id/reject')
  reject(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: RejectApplicationDto) {
    return this.partners.reject(adminId, id, dto.reason);
  }
}
