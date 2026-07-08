import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { AdminAccountsService } from './admin-accounts.service';
import { SetAccountStatusDto, SetLeverageDto } from './admin-accounts.dto';

// Account administration (suspend/activate/leverage) is Admin-only.
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/accounts')
export class AdminAccountsController {
  constructor(private readonly accounts: AdminAccountsService) {}

  @Get()
  list() {
    return this.accounts.listAll();
  }

  @Get('dormant')
  dormant() {
    return this.accounts.listDormant();
  }

  @Patch(':id/status')
  setStatus(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: SetAccountStatusDto) {
    return this.accounts.setStatus(adminId, id, dto.status);
  }

  @Patch(':id/leverage')
  setLeverage(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: SetLeverageDto) {
    return this.accounts.setLeverage(adminId, id, dto.leverage);
  }
}
