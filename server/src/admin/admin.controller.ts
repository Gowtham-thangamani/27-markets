import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles, type AuthUser } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminController {
  @Get('ping')
  ping(@CurrentUser() user: AuthUser) {
    return { ok: true, staff: { id: user.id, email: user.email, role: user.role } };
  }
}
