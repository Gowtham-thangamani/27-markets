import { Injectable } from '@nestjs/common';
import { LeadSource, LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CaptureLeadDto } from './dto';

export interface RegisterLeadInput {
  name: string;
  email: string;
  phone?: string;
  country?: string;
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Capture a public prospect (demo request / contact). De-dupes against an
   * existing open lead with the same email so repeat submissions don't pile up.
   */
  async capture(dto: CaptureLeadDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.lead.findFirst({
      where: { email, status: { in: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      // Don't pile up duplicates from repeat submissions.
      return { id: existing.id, deduped: true };
    }

    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name,
        email,
        phone: dto.phone,
        country: dto.country,
        source: dto.source ?? LeadSource.DEMO,
        status: LeadStatus.NEW,
      },
    });
    await this.audit.record({ action: 'lead.capture', entity: 'Lead', entityId: lead.id, metadata: { source: lead.source } });
    return { id: lead.id, deduped: false };
  }

  /**
   * Connect the signup funnel: if a prospect already exists for this email,
   * mark that lead CONVERTED and link the new user; otherwise record a fresh
   * REGISTER → CONVERTED lead. Never throws into the registration flow.
   */
  async convertOnRegister(userId: string, input: RegisterLeadInput): Promise<void> {
    try {
      const email = input.email.toLowerCase();
      const existing = await this.prisma.lead.findFirst({
        where: { email, status: { not: LeadStatus.CONVERTED } },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await this.prisma.lead.update({
          where: { id: existing.id },
          data: { status: LeadStatus.CONVERTED, convertedUserId: userId },
        });
      } else {
        await this.prisma.lead.create({
          data: {
            name: input.name,
            email,
            phone: input.phone,
            country: input.country,
            source: LeadSource.REGISTER,
            status: LeadStatus.CONVERTED,
            convertedUserId: userId,
          },
        });
      }
    } catch {
      /* lead tracking must never break signup */
    }
  }
}
