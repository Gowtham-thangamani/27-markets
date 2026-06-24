import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators';
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
}
