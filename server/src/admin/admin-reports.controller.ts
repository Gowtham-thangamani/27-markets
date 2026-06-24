import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminReportsService } from './admin-reports.service';

// Reports: Admin full, Agent read — both staff roles may view.
@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reports: AdminReportsService) {}

  @Get()
  summary() {
    return this.reports.summary();
  }
}
