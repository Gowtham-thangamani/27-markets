import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminPaymentGatewaysService } from './admin-payment-gateways.service';
import { CreatePaymentGatewayDto, UpdatePaymentGatewayDto } from './payment-gateway-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/payment-gateways')
export class AdminPaymentGatewaysController {
  constructor(private readonly gateways: AdminPaymentGatewaysService) {}

  @Get()
  list() {
    return this.gateways.list();
  }

  // Mutations are Admin-only (method-level role overrides the class default).
  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreatePaymentGatewayDto) {
    return this.gateways.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdatePaymentGatewayDto) {
    return this.gateways.update(adminId, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.gateways.remove(adminId, id);
  }
}
