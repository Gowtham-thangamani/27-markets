import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { KycService } from './kyc.service';
import { SubmitKycDto, ReviewKycDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get()
  status(@CurrentUser('id') userId: string) {
    return this.kyc.status(userId);
  }

  @HttpCode(200)
  @Post('submit')
  submit(@CurrentUser('id') userId: string, @Body() dto: SubmitKycDto) {
    return this.kyc.submit(userId, dto);
  }

  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('review')
  review(@CurrentUser('id') reviewerId: string, @Body() dto: ReviewKycDto) {
    return this.kyc.review(reviewerId, dto.userId, dto.step, dto.status);
  }
}
