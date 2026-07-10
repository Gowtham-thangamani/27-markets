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
import { InstrumentsService } from './instruments.service';
import { CreateInstrumentDto, UpdateInstrumentDto } from './dto';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
export class InstrumentsController {
  constructor(private readonly instruments: InstrumentsService) {}

  // ───────────── Public read ─────────────

  @Public()
  @Get('instruments')
  list() {
    return this.instruments.listPublic();
  }

  // ───────────── Admin CRUD ─────────────

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/instruments')
  adminList() {
    return this.instruments.listAll();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/instruments')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateInstrumentDto) {
    return this.instruments.create(userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/instruments/:id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInstrumentDto,
  ) {
    return this.instruments.update(userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/instruments/:id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.instruments.remove(userId, id);
  }
}
