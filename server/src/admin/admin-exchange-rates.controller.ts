import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminExchangeRatesService } from './admin-exchange-rates.service';
import { CreateExchangeRateDto, UpdateExchangeRateDto } from './exchange-rate-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/exchange-rates')
export class AdminExchangeRatesController {
  constructor(private readonly rates: AdminExchangeRatesService) {}

  @Get()
  list() {
    return this.rates.list();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateExchangeRateDto) {
    return this.rates.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdateExchangeRateDto) {
    return this.rates.update(adminId, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.rates.remove(adminId, id);
  }
}
