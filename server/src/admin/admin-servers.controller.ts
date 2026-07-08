import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminServersService } from './admin-servers.service';
import { CreateServerDto, UpdateServerDto } from './server-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/servers')
export class AdminServersController {
  constructor(private readonly servers: AdminServersService) {}

  @Get()
  list() {
    return this.servers.list();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateServerDto) {
    return this.servers.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdateServerDto) {
    return this.servers.update(adminId, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.servers.remove(adminId, id);
  }
}
