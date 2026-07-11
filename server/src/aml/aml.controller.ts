import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AmlService } from './aml.service';
import { CurrentUser, Roles } from '../common/decorators';
import { RolesGuard } from '../auth/guards/roles.guard';

/** Compliance screening — admin only. */
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/aml')
export class AmlController {
  constructor(private readonly aml: AmlService) {}

  /** Screenings that need a compliance decision (REVIEW / HIT). */
  @Get('screenings')
  screenings() {
    return this.aml.listForReview();
  }

  /** Run (or re-run) a screening for a client. */
  @HttpCode(200)
  @Post('screen/:userId')
  screen(@CurrentUser('id') adminId: string, @Param('userId') userId: string) {
    return this.aml.screen(userId, adminId);
  }
}
