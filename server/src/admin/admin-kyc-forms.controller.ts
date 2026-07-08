import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminKycFormsService } from './admin-kyc-forms.service';
import { CreateKycFormDto, UpdateKycFormDto } from './kyc-form-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/kyc-forms')
export class AdminKycFormsController {
  constructor(private readonly forms: AdminKycFormsService) {}

  @Get()
  list() {
    return this.forms.list();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateKycFormDto) {
    return this.forms.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdateKycFormDto) {
    return this.forms.update(adminId, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.forms.remove(adminId, id);
  }
}
