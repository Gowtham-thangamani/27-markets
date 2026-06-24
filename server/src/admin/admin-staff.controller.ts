import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { AdminStaffService } from './admin-staff.service';
import { SetRoleDto } from './admin-staff.dto';

// Staff/role management + audit log are Admin-only.
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminStaffController {
  constructor(private readonly staff: AdminStaffService) {}

  @Get('team')
  team() {
    return this.staff.listStaff();
  }

  @Patch('team/:id/role')
  setRole(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: SetRoleDto) {
    return this.staff.setRole(adminId, id, dto.role);
  }

  @Get('audit')
  audit(@Query('action') action?: string) {
    return this.staff.auditLog(action);
  }
}
