import { Injectable } from '@nestjs/common';
import { KycStepStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { KycStep, SubmitKycDto } from './dto';

const STEP_FIELD: Record<KycStep, 'identityStatus' | 'addressStatus' | 'selfieStatus'> = {
  identity: 'identityStatus',
  address: 'addressStatus',
  selfie: 'selfieStatus',
};

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async status(userId: string) {
    const profile = await this.prisma.kycProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const steps = [
      { id: 'identity', status: profile.identityStatus },
      { id: 'address', status: profile.addressStatus },
      { id: 'selfie', status: profile.selfieStatus },
    ];
    const approved = steps.filter((s) => s.status === KycStepStatus.APPROVED).length;

    return {
      steps,
      progress: Math.round((approved / steps.length) * 100),
      verified: approved === steps.length,
    };
  }

  async submit(userId: string, dto: SubmitKycDto) {
    const profile = await this.prisma.kycProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    await this.prisma.$transaction([
      this.prisma.kycProfile.update({
        where: { id: profile.id },
        data: { [STEP_FIELD[dto.step]]: KycStepStatus.PENDING } as Prisma.KycProfileUpdateInput,
      }),
      this.prisma.kycDocument.create({
        data: {
          kycProfileId: profile.id,
          step: dto.step,
          storageKey: dto.storageKey,
          fileName: dto.fileName,
          mimeType: dto.mimeType,
        },
      }),
    ]);

    await this.audit.record({ userId, action: 'kyc.submit', entity: 'KycProfile', entityId: profile.id, metadata: { step: dto.step } });
    return this.status(userId);
  }

  /** Compliance/admin review. In production this is driven by a KYC provider. */
  async review(reviewerId: string, userId: string, step: KycStep, status: KycStepStatus) {
    const profile = await this.prisma.kycProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    await this.prisma.kycProfile.update({
      where: { id: profile.id },
      data: { [STEP_FIELD[step]]: status } as Prisma.KycProfileUpdateInput,
    });
    await this.audit.record({ userId: reviewerId, action: 'kyc.review', entity: 'KycProfile', entityId: profile.id, metadata: { subjectUserId: userId, step, status } });
    return this.status(userId);
  }
}
