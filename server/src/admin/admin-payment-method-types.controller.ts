import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminPaymentMethodTypesService } from './admin-payment-method-types.service';
import { CreatePaymentMethodTypeDto, UpdatePaymentMethodTypeDto } from './payment-method-type-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/payment-method-types')
export class AdminPaymentMethodTypesController {
  constructor(private readonly types: AdminPaymentMethodTypesService) {}

  @Get()
  list(@Query('category') category?: string) {
    const valid = category === 'CARD' || category === 'EWALLET' ? category : undefined;
    return this.types.list(valid);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreatePaymentMethodTypeDto) {
    return this.types.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdatePaymentMethodTypeDto) {
    return this.types.update(adminId, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.types.remove(adminId, id);
  }
}
