import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { KycStepStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AmlService } from '../aml/aml.service';
import type { Env } from '../config/env.validation';
import { KYC_PROVIDER, type KycProvider } from './kyc-provider';
import { primaryOrigin } from '../common/origin';

/**
 * Starts hosted identity-verification sessions via the KYC provider seam, and
 * ingests the provider's asynchronous verdict webhook. Kept separate from
 * KycService so the (manual) document-review flow is untouched.
 */
@Injectable()
export class KycVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(KYC_PROVIDER) private readonly provider: KycProvider,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
    private readonly aml: AmlService,
  ) {}

  async startSession(userId: string): Promise<{ url: string | null; sdkToken: string | null; provider: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const origin = primaryOrigin(this.config.get('CLIENT_ORIGIN', { infer: true }));
    const session = await this.provider.createVerificationSession({
      userId,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      returnUrl: `${origin}/portal/kyc?verify=done`,
    });

    // Correlate a hosted session back to this profile via its reference.
    if (session.reference) {
      await this.prisma.kycProfile.upsert({
        where: { userId },
        update: { providerRef: session.reference },
        create: { userId, providerRef: session.reference },
      });
    }
    return { url: session.url, sdkToken: session.sdkToken ?? null, provider: session.provider };
  }

  /**
   * Apply a verified SumSub `applicantReviewed` webhook. Verifies the payload
   * signature (HMAC over the raw body), maps GREEN→APPROVED / RED→REJECTED onto
   * the profile's KYC steps, and — on approval — runs AML screening. Idempotent:
   * re-delivering the same verdict just re-sets the same statuses.
   */
  async applySumsubVerdict(rawBody: Buffer, digestHeader: string | undefined): Promise<{ handled: boolean }> {
    const secret =
      this.config.get('KYC_WEBHOOK_SECRET', { infer: true }) ?? this.config.get('KYC_PROVIDER_SECRET', { infer: true });
    if (!secret) throw new BadRequestException('KYC webhook secret not configured.');
    if (!digestHeader || !this.verifySignature(rawBody, digestHeader, secret)) {
      throw new BadRequestException('Invalid KYC webhook signature.');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as {
      type?: string;
      applicantId?: string;
      externalUserId?: string;
      reviewResult?: { reviewAnswer?: 'GREEN' | 'RED' };
    };
    if (event.type !== 'applicantReviewed') return { handled: false };

    const answer = event.reviewResult?.reviewAnswer;
    if (answer !== 'GREEN' && answer !== 'RED') return { handled: false };

    // Locate the profile: prefer our externalUserId, else the applicant ref.
    const profile = event.externalUserId
      ? await this.prisma.kycProfile.findUnique({ where: { userId: event.externalUserId } })
      : event.applicantId
        ? await this.prisma.kycProfile.findFirst({ where: { providerRef: event.applicantId } })
        : null;
    if (!profile) throw new NotFoundException('No KYC profile for this applicant.');

    const status = answer === 'GREEN' ? KycStepStatus.APPROVED : KycStepStatus.REJECTED;
    await this.prisma.kycProfile.update({
      where: { userId: profile.userId },
      data: { identityStatus: status, addressStatus: status, selfieStatus: status },
    });
    await this.audit.record({
      userId: profile.userId,
      action: 'kyc.verdict.sumsub',
      entity: 'KycProfile',
      entityId: profile.id,
      metadata: { reviewAnswer: answer, applicantId: event.applicantId ?? null },
    });

    // Sanctions/PEP screening runs on a newly-approved identity (best-effort).
    if (answer === 'GREEN') await this.aml.screenSafe(profile.userId);

    return { handled: true };
  }

  private verifySignature(rawBody: Buffer, digestHeader: string, secret: string): boolean {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(digestHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
