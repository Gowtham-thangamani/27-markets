import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { PartnerApplicationStatus, UserRole, VerificationTokenType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { generateReferralCode } from './referral-code';
import type { Env } from '../config/env.validation';
import type { ApplyPartnerDto } from './dto';

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async apply(dto: ApplyPartnerDto): Promise<{ id: string }> {
    const app = await this.prisma.partnerApplication.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        country: dto.country,
        company: dto.company,
        website: dto.website,
        audience: dto.audience,
        status: 'PENDING',
      },
    });
    await this.audit.record({ action: 'partner.application.create', entity: 'PartnerApplication', entityId: app.id });
    return { id: app.id };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async uniqueReferralCode(): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const code = generateReferralCode();
      const clash = await this.prisma.partnerProfile.findUnique({ where: { referralCode: code } });
      if (!clash) return code;
    }
    throw new Error('Could not generate a unique referral code');
  }

  listApplications(status?: PartnerApplicationStatus) {
    return this.prisma.partnerApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async approve(adminId: string, id: string): Promise<{ ok: true; referralCode: string; inviteUrl: string }> {
    const app = await this.prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== PartnerApplicationStatus.PENDING) throw new BadRequestException('Application is not pending');

    const email = app.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('A user with this email already exists; resolve manually');
    }

    const referralCode = await this.uniqueReferralCode();
    const rawToken = randomBytes(32).toString('hex');
    const randomPassword = await argon2.hash(randomBytes(24).toString('hex'), { type: argon2.argon2id });

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: randomPassword,
          firstName: app.firstName,
          lastName: app.lastName,
          phone: app.phone,
          country: app.country,
          role: UserRole.PARTNER,
          emailVerified: true,
          acceptedTermsAt: new Date(),
          partnerProfile: { create: { referralCode } },
        },
      });
      await tx.verificationToken.create({
        data: {
          userId: user.id,
          type: VerificationTokenType.PARTNER_INVITE,
          tokenHash: this.hashToken(rawToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      await tx.partnerApplication.update({
        where: { id },
        data: { status: PartnerApplicationStatus.APPROVED, reviewedAt: new Date(), reviewedById: adminId, resultingUserId: user.id },
      });
    });

    await this.audit.record({ userId: adminId, action: 'partner.application.approve', entity: 'PartnerApplication', entityId: id, metadata: { referralCode } });
    const origin = this.config.get('CLIENT_ORIGIN', { infer: true });
    return { ok: true, referralCode, inviteUrl: `${origin}/reset-password?token=${rawToken}` };
  }

  async reject(adminId: string, id: string, reason?: string): Promise<{ ok: true }> {
    const app = await this.prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== PartnerApplicationStatus.PENDING) throw new BadRequestException('Application is not pending');
    await this.prisma.partnerApplication.update({
      where: { id },
      data: { status: PartnerApplicationStatus.REJECTED, reviewedAt: new Date(), reviewedById: adminId, notes: reason },
    });
    await this.audit.record({ userId: adminId, action: 'partner.application.reject', entity: 'PartnerApplication', entityId: id, metadata: { reason } });
    return { ok: true };
  }
}
