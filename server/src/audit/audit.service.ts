import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requestContext } from '../common/request-context';

export interface AuditInput {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/** Append-only audit trail. Failures here must never break the main flow. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    try {
      // Fall back to the per-request context so every audit entry carries the
      // caller's source IP / user-agent without threading them through callers.
      const ctx = requestContext.getStore();
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          metadata: input.metadata as object | undefined,
          ip: input.ip ?? ctx?.ip,
          userAgent: input.userAgent ?? ctx?.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log for ${input.action}`, err as Error);
    }
  }
}
