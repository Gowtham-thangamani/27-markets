import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DownloadsService } from './downloads.service';
import { CreateDownloadDto, UpdateDownloadDto } from './dto';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
export class DownloadsController {
  constructor(private readonly downloads: DownloadsService) {}

  // ───────────── Public read ─────────────

  @Public()
  @Get('downloads')
  list() {
    return this.downloads.listPublic();
  }

  // ───────────── Admin CRUD ─────────────

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/downloads')
  adminList() {
    return this.downloads.listAll();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/downloads')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDownloadDto) {
    return this.downloads.create(userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/downloads/:id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDownloadDto,
  ) {
    return this.downloads.update(userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/downloads/:id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.downloads.remove(userId, id);
  }
}
