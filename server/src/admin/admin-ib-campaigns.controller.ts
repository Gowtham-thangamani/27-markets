import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminIbCampaignsService } from './admin-ib-campaigns.service';
import { CreateIbCampaignDto, UpdateIbCampaignDto } from './ib-campaign-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/ib-campaigns')
export class AdminIbCampaignsController {
  constructor(private readonly campaigns: AdminIbCampaignsService) {}

  @Get()
  list() {
    return this.campaigns.list();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateIbCampaignDto) {
    return this.campaigns.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdateIbCampaignDto) {
    return this.campaigns.update(adminId, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.campaigns.remove(adminId, id);
  }
}
