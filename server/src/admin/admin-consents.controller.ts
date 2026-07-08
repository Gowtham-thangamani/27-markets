import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminConsentsService } from './admin-consents.service';
import { CreateConsentDto, UpdateConsentDto } from './consent-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/consents')
export class AdminConsentsController {
  constructor(private readonly consents: AdminConsentsService) {}

  @Get()
  list() {
    return this.consents.list();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateConsentDto) {
    return this.consents.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdateConsentDto) {
    return this.consents.update(adminId, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.consents.remove(adminId, id);
  }
}
