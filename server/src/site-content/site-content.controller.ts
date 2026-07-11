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
import { SiteContentService } from './site-content.service';
import {
  CreateTestimonialDto,
  UpdateTestimonialDto,
  CreateDfmSymbolDto,
  UpdateDfmSymbolDto,
} from './dto';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
export class SiteContentController {
  constructor(private readonly content: SiteContentService) {}

  // ───────────── Public reads ─────────────

  @Public()
  @Get('content/testimonials')
  testimonials() {
    return this.content.listPublicTestimonials();
  }

  @Public()
  @Get('content/dfm-symbols')
  dfmSymbols() {
    return this.content.listPublicDfm();
  }

  // ───────────── Admin: testimonials ─────────────

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/content/testimonials')
  adminTestimonials() {
    return this.content.listAllTestimonials();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/content/testimonials')
  createTestimonial(@CurrentUser('id') userId: string, @Body() dto: CreateTestimonialDto) {
    return this.content.createTestimonial(userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/content/testimonials/:id')
  updateTestimonial(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTestimonialDto,
  ) {
    return this.content.updateTestimonial(userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/content/testimonials/:id')
  removeTestimonial(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.content.removeTestimonial(userId, id);
  }

  // ───────────── Admin: DFM symbols ─────────────

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/content/dfm-symbols')
  adminDfm() {
    return this.content.listAllDfm();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/content/dfm-symbols')
  createDfm(@CurrentUser('id') userId: string, @Body() dto: CreateDfmSymbolDto) {
    return this.content.createDfm(userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/content/dfm-symbols/:id')
  updateDfm(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDfmSymbolDto,
  ) {
    return this.content.updateDfm(userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/content/dfm-symbols/:id')
  removeDfm(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.content.removeDfm(userId, id);
  }
}
