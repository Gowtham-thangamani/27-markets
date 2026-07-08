import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KycStepStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { STORAGE_PROVIDER, type StorageProvider } from './storage-provider';
import type { KycStep } from './dto';

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
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
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

  /** Enabled KYC questions + extended fields the client should complete. */
  listFields() {
    return this.prisma.kycFieldDefinition.findMany({
      where: { enabled: true, kind: { in: ['QUESTION', 'EXTENDED'] } },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
      select: { id: true, kind: true, label: true, fieldType: true, required: true },
    });
  }

  /** The client's saved answers, keyed by field id. */
  async getAnswers(userId: string): Promise<Record<string, string>> {
    const rows = await this.prisma.kycAnswer.findMany({ where: { userId }, select: { fieldId: true, value: true } });
    return Object.fromEntries(rows.map((r) => [r.fieldId, r.value]));
  }

  /** Upsert the client's answers to the KYC fields. */
  async saveAnswers(userId: string, answers: { fieldId: string; value: string }[]) {
    await this.prisma.$transaction(
      answers.map((a) =>
        this.prisma.kycAnswer.upsert({
          where: { userId_fieldId: { userId, fieldId: a.fieldId } },
          update: { value: a.value },
          create: { userId, fieldId: a.fieldId, value: a.value },
        }),
      ),
    );
    await this.audit.record({ userId, action: 'kyc.answers.save', entity: 'KycAnswer', entityId: userId, metadata: { count: answers.length } });
    return this.getAnswers(userId);
  }

  /** Enabled consent statements the client must agree to. */
  listConsents() {
    return this.prisma.consent.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, label: true, body: true, required: true },
    });
  }

  async getAcceptedConsentIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.consentAcceptance.findMany({ where: { userId }, select: { consentId: true } });
    return rows.map((r) => r.consentId);
  }

  async acceptConsents(userId: string, consentIds: string[]) {
    await this.prisma.$transaction(
      consentIds.map((consentId) =>
        this.prisma.consentAcceptance.upsert({
          where: { userId_consentId: { userId, consentId } },
          update: {},
          create: { userId, consentId },
        }),
      ),
    );
    await this.audit.record({ userId, action: 'kyc.consents.accept', entity: 'ConsentAcceptance', entityId: userId, metadata: { count: consentIds.length } });
    return this.getAcceptedConsentIds(userId);
  }

  async status(userId: string) {
    const profile = await this.prisma.kycProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    // Latest uploaded filename per step, so the portal can show what's on file.
    const docs = await this.prisma.kycDocument.findMany({
      where: { kycProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: { step: true, fileName: true },
    });
    const latestFile = new Map<string, string>();
    for (const d of docs) if (!latestFile.has(d.step)) latestFile.set(d.step, d.fileName);

    const steps = [
      { id: 'identity', status: profile.identityStatus, fileName: latestFile.get('identity') ?? null },
      { id: 'address', status: profile.addressStatus, fileName: latestFile.get('address') ?? null },
      { id: 'selfie', status: profile.selfieStatus, fileName: latestFile.get('selfie') ?? null },
    ];
    const approved = steps.filter((s) => s.status === KycStepStatus.APPROVED).length;

    return {
      steps,
      progress: Math.round((approved / steps.length) * 100),
      verified: approved === steps.length,
    };
  }

  /** Store an uploaded document, mark the step PENDING for review. */
  async uploadDocument(userId: string, step: KycStep, file: UploadedFile) {
    const profile = await this.prisma.kycProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const storageKey = await this.storage.save(userId, file.originalname, file.buffer, file.mimetype);

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
