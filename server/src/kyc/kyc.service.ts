import { Injectable, NotFoundException } from '@nestjs/common';
import { KycStepStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { KycStorageService } from './storage';
import type { KycStep, SubmitKycDto } from './dto';

const STEP_FIELD: Record<KycStep, 'identityStatus' | 'addressStatus' | 'selfieStatus'> = {
  identity: 'identityStatus',
  address: 'addressStatus',
  selfie: 'selfieStatus',
};

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: KycStorageService,
  ) {}

  /** True when all three KYC steps are approved (gates LIVE withdrawals). */
  async isVerified(userId: string): Promise<boolean> {
    const p = await this.prisma.kycProfile.findUnique({ where: { userId } });
    if (!p) return false;
    return (
      p.identityStatus === KycStepStatus.APPROVED &&
      p.addressStatus === KycStepStatus.APPROVED &&
      p.selfieStatus === KycStepStatus.APPROVED
    );
  }

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

  /** Record a document submitted via the signed-URL flow (step → PENDING). */
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

  /** Store an uploaded document, mark the step PENDING for review. */
  async uploadDocument(userId: string, step: KycStep, file: UploadedFile) {
    const profile = await this.prisma.kycProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const storageKey = await this.storage.save(userId, file.originalname, file.buffer);

    await this.prisma.$transaction([
      this.prisma.kycProfile.update({
        where: { id: profile.id },
        data: { [STEP_FIELD[step]]: KycStepStatus.PENDING } as Prisma.KycProfileUpdateInput,
      }),
      this.prisma.kycDocument.create({
        data: {
          kycProfileId: profile.id,
          step,
          storageKey,
          fileName: file.originalname,
          mimeType: file.mimetype,
        },
      }),
    ]);

    await this.audit.record({ userId, action: 'kyc.upload', entity: 'KycProfile', entityId: profile.id, metadata: { step } });
    return this.status(userId);
  }

  /** Latest uploaded document per step for a user (staff review view). */
  async documentsFor(userId: string) {
    const profile = await this.prisma.kycProfile.findUnique({ where: { userId } });
    if (!profile) return [];
    const docs = await this.prisma.kycDocument.findMany({
      where: { kycProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, step: true, fileName: true, mimeType: true, createdAt: true },
    });
    // De-dupe to the most recent per step.
    const seen = new Set<string>();
    return docs.filter((d) => (seen.has(d.step) ? false : (seen.add(d.step), true)));
  }

  /** Read a stored document for streaming to staff. */
  async readDocument(documentId: string) {
    const doc = await this.prisma.kycDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    const { buffer, mimeType } = await this.storage.read(doc.storageKey, doc.mimeType ?? 'application/octet-stream');
    return { buffer, mimeType, fileName: doc.fileName };
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
