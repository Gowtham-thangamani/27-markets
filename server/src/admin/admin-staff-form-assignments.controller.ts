import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminStaffFormAssignmentsService } from './admin-staff-form-assignments.service';
import { CreateStaffFormAssignmentDto } from './staff-form-assignment-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/staff-form-assignments')
export class AdminStaffFormAssignmentsController {
  constructor(private readonly assignments: AdminStaffFormAssignmentsService) {}

  @Get()
  list() {
    return this.assignments.list();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateStaffFormAssignmentDto) {
    return this.assignments.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.assignments.remove(adminId, id);
  }
}
