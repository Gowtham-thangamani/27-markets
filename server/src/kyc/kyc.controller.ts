import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { KycService, type UploadedFile as KycFile } from './kyc.service';
import { AcceptConsentsDto, KYC_STEPS, type KycStep, ReviewKycDto, SaveKycAnswersDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { RolesGuard } from '../auth/guards/roles.guard';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = /^(image\/(png|jpe?g|webp)|application\/pdf)$/;

@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get()
  status(@CurrentUser('id') userId: string) {
    return this.kyc.status(userId);
  }

  /** Configured KYC questions + extended fields the client should complete. */
  @Get('fields')
  fields() {
    return this.kyc.listFields();
  }

  @Get('answers')
  answers(@CurrentUser('id') userId: string) {
    return this.kyc.getAnswers(userId);
  }

  @HttpCode(200)
  @Post('answers')
  saveAnswers(@CurrentUser('id') userId: string, @Body() dto: SaveKycAnswersDto) {
    return this.kyc.saveAnswers(userId, dto.answers);
  }

  /** Enabled consents + whether the client has accepted each. */
  @Get('consents')
  async consents(@CurrentUser('id') userId: string) {
    const [consents, accepted] = await Promise.all([this.kyc.listConsents(), this.kyc.getAcceptedConsentIds(userId)]);
    const acceptedSet = new Set(accepted);
    return consents.map((c) => ({ ...c, accepted: acceptedSet.has(c.id) }));
  }

  @HttpCode(200)
  @Post('consents')
  acceptConsents(@CurrentUser('id') userId: string, @Body() dto: AcceptConsentsDto) {
    return this.kyc.acceptConsents(userId, dto.consentIds);
  }

  /** Client uploads a document for a step (multipart). Marks the step PENDING. */
  @HttpCode(200)
  @Post('upload/:step')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }))
  upload(
    @CurrentUser('id') userId: string,
    @Param('step') step: string,
    @UploadedFile() file?: KycFile,
  ) {
    if (!KYC_STEPS.includes(step as KycStep)) {
      throw new BadRequestException('Invalid KYC step');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!ALLOWED_MIME.test(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Upload a PNG, JPG, WEBP, or PDF.');
    }
    return this.kyc.uploadDocument(userId, step as KycStep, file);
  }

  // ── Staff (compliance) ──

  /** Latest document per step for a client. */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @Get('documents/:userId')
  documents(@Param('userId') userId: string) {
    return this.kyc.documentsFor(userId);
  }

  /** Stream a stored document inline for staff review. */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @Get('document/:id')
  async document(@Param('id') id: string, @Res() res: Response) {
    const { buffer, mimeType, fileName } = await this.kyc.readDocument(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'private, no-store',
    });
    res.send(buffer);
  }

  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('review')
  review(@CurrentUser('id') reviewerId: string, @Body() dto: ReviewKycDto) {
    return this.kyc.review(reviewerId, dto.userId, dto.step, dto.status);
  }
}
