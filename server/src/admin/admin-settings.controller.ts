import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminSettingsService } from './admin-settings.service';
import { UpdateSettingsDto } from './settings-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: AdminSettingsService) {}

  @Get()
  list() {
    return this.settings.list();
  }

  // Editing settings is Admin-only (method-level role overrides the class default).
  @Roles(UserRole.ADMIN)
  @Patch()
  update(@CurrentUser('id') adminId: string, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(adminId, dto);
  }
}
