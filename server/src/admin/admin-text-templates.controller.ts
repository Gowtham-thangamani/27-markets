import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminTextTemplatesService } from './admin-text-templates.service';
import { CreateTextTemplateDto, UpdateTextTemplateDto } from './text-template-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/text-templates')
export class AdminTextTemplatesController {
  constructor(private readonly templates: AdminTextTemplatesService) {}

  @Get()
  list(@Query('kind') kind?: string) {
    const valid = kind === 'PDF' || kind === 'COMMENT' ? kind : undefined;
    return this.templates.list(valid);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateTextTemplateDto) {
    return this.templates.create(adminId, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: UpdateTextTemplateDto) {
    return this.templates.update(adminId, id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.templates.remove(adminId, id);
  }
}
