import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { EconomicCalendarService } from './economic-calendar.service';
import { CreateEventDto, UpdateEventDto } from './dto';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
export class EconomicCalendarController {
  constructor(private readonly calendar: EconomicCalendarService) {}

  // ───────────── Public read ─────────────

  @Public()
  @Get('economic-calendar')
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.calendar.listPublic(from, to);
  }

  // ───────────── Admin CRUD ─────────────

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/economic-calendar')
  adminList() {
    return this.calendar.listAll();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/economic-calendar')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateEventDto) {
    return this.calendar.create(userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/economic-calendar/:id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendar.update(userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/economic-calendar/:id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.calendar.remove(userId, id);
  }
}
