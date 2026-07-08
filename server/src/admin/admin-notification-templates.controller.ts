import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminNotificationTemplatesService } from './admin-notification-templates.service';
import { UpdateNotificationTemplateDto } from './notification-template-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/notification-templates')
export class AdminNotificationTemplatesController {
  constructor(private readonly templates: AdminNotificationTemplatesService) {}

  @Get()
  list() {
    return this.templates.list();
  }

  // Editing templates is Admin-only (method-level role overrides the class default).
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdateNotificationTemplateDto) {
    return this.templates.update(adminId, id, dto);
  }
}
