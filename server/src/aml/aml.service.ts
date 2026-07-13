import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AmlScreeningStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AML_PROVIDER, type AmlProvider } from './aml-provider';

export interface AmlScreeningView {
  id: string;
  userId: string;
  client?: string;
  status: AmlScreeningStatus;
  provider: string;
  hits: unknown;
  screenedAt: string;
}

@Injectable()
export class AmlService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AML_PROVIDER) private readonly provider: AmlProvider,
    private readonly audit: AuditService,
  ) {}

  /** Screen a user against the provider and persist the result. */
  async screen(userId: string, actorId?: string): Promise<AmlScreeningView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, country: true, dateOfBirth: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const result = await this.provider.screen({
      userId,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      country: user.country,
      dateOfBirth: user.dateOfBirth,
    });

    const row = await this.prisma.amlScreening.create({
      data: {
        userId,
        status: result.status as AmlScreeningStatus,
        provider: result.provider,
        reference: result.reference ?? null,
        hits: result.hits as object,
      },
    });
    await this.audit.record({
      userId: actorId ?? null,
      action: 'aml.screen',
      entity: 'AmlScreening',
      entityId: row.id,
      metadata: { subjectUserId: userId, status: result.status, provider: result.provider },
    });
    return {
      id: row.id,
      userId,
      status: row.status,
      provider: row.provider,
      hits: result.hits,
      screenedAt: row.screenedAt.toISOString(),
    };
  }

  /** Best-effort screen — never throws into the caller (e.g. KYC approval). */
  async screenSafe(userId: string, actorId?: string): Promise<void> {
    try {
      await this.screen(userId, actorId);
    } catch {
      /* screening failures must not block the primary flow */
    }
  }

  /** The most recent screening for a user (or null). */
  latest(userId: string) {
    return this.prisma.amlScreening.findFirst({
      where: { userId },
      orderBy: { screenedAt: 'desc' },
    });
  }

  /**
   * Money-out gate — fail-closed. Requires a positive CLEAR screening: blocks on
   * HIT/REVIEW and on the absence of any screening. When none exists yet, screens
   * on demand (real provider in LIVE; auto-CLEAR in simulation) and re-checks, so
   * a user can never withdraw without having been screened clear.
   */
  async assertNotBlocked(userId: string): Promise<void> {
    let latest = await this.latest(userId);
    if (!latest) {
      await this.screenSafe(userId);
      latest = await this.latest(userId);
    }
    if (latest?.status !== AmlScreeningStatus.CLEAR) {
      throw new ForbiddenException('Account is under compliance review. Please contact support.');
    }
  }

  /** Screenings needing attention (REVIEW / HIT), newest first, for the admin. */
  async listForReview(): Promise<AmlScreeningView[]> {
    const rows = await this.prisma.amlScreening.findMany({
      where: { status: { in: [AmlScreeningStatus.REVIEW, AmlScreeningStatus.HIT] } },
      orderBy: { screenedAt: 'desc' },
      take: 200,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      client: `${r.user.firstName} ${r.user.lastName}`.trim(),
      status: r.status,
      provider: r.provider,
      hits: r.hits,
      screenedAt: r.screenedAt.toISOString(),
    }));
  }
}
