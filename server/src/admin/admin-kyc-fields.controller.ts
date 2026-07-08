import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminKycFieldsService } from './admin-kyc-fields.service';
import { CreateKycFieldDto, UpdateKycFieldDto } from './kyc-field-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/kyc-fields')
export class AdminKycFieldsController {
  constructor(private readonly fields: AdminKycFieldsService) {}

  @Get()
  list(@Query('kind') kind?: string) {
    const valid = kind === 'QUESTION' || kind === 'EXTENDED' ? kind : undefined;
    return this.fields.list(valid);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateKycFieldDto) {
    return this.fields.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdateKycFieldDto) {
    return this.fields.update(adminId, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.fields.remove(adminId, id);
  }
}
