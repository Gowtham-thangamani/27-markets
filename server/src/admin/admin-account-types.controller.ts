import { BadRequestException, Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AccountType, UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminAccountTypesService } from './admin-account-types.service';
import { UpdateAccountTypeDto } from './account-type-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/account-types')
export class AdminAccountTypesController {
  constructor(private readonly service: AdminAccountTypesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  // Editing trading conditions is Admin-only (method-level role overrides the class default).
  @Roles(UserRole.ADMIN)
  @Patch(':type')
  update(@CurrentUser('id') adminId: string, @Param('type') type: string, @Body() dto: UpdateAccountTypeDto) {
    if (!(Object.values(AccountType) as string[]).includes(type)) {
      throw new BadRequestException('Invalid account type');
    }
    return this.service.update(adminId, type as AccountType, dto);
  }
}
