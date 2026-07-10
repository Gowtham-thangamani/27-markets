import { Injectable, NotFoundException } from '@nestjs/common';
import { EconomicImpact } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateEventDto, UpdateEventDto } from './dto';

export interface EventView {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: EconomicImpact;
  eventAt: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  enabled: boolean;
}

@Injectable()
export class EconomicCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────────── Public ─────────────

  /**
   * Enabled events for the client calendar. Defaults to a forward-looking
   * window (from now); `from`/`to` narrow it. Ordered chronologically.
   */
  async listPublic(from?: string, to?: string): Promise<EventView[]> {
    const gte = from ? new Date(from) : new Date();
    const where: {
      enabled: true;
      eventAt: { gte: Date; lte?: Date };
    } = { enabled: true, eventAt: { gte } };
    if (to) where.eventAt.lte = new Date(to);

    const rows = await this.prisma.economicEvent.findMany({
      where,
      orderBy: { eventAt: 'asc' },
      take: 200,
    });
    return rows.map(toView);
  }

  // ───────────── Admin ─────────────

  /** Everything (incl. disabled + past), newest scheduled first, for the CRM. */
  async listAll(): Promise<EventView[]> {
    const rows = await this.prisma.economicEvent.findMany({
      orderBy: { eventAt: 'desc' },
      take: 500,
    });
    return rows.map(toView);
  }

  async create(actorId: string, dto: CreateEventDto): Promise<EventView> {
    const row = await this.prisma.economicEvent.create({
      data: {
        title: dto.title,
        country: dto.country,
        currency: dto.currency,
        impact: dto.impact ?? EconomicImpact.MEDIUM,
        eventAt: new Date(dto.eventAt),
        actual: dto.actual ?? null,
        forecast: dto.forecast ?? null,
        previous: dto.previous ?? null,
        enabled: dto.enabled ?? true,
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'economic_event.create',
      entity: 'EconomicEvent',
      entityId: row.id,
      metadata: { title: row.title },
    });
    return toView(row);
  }

  async update(actorId: string, id: string, dto: UpdateEventDto): Promise<EventView> {
    await this.ensureExists(id);
    const row = await this.prisma.economicEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.impact !== undefined ? { impact: dto.impact } : {}),
        ...(dto.eventAt !== undefined ? { eventAt: new Date(dto.eventAt) } : {}),
        // Empty string clears an optional value; a real string sets it.
        ...(dto.actual !== undefined ? { actual: dto.actual === '' ? null : dto.actual } : {}),
        ...(dto.forecast !== undefined ? { forecast: dto.forecast === '' ? null : dto.forecast } : {}),
        ...(dto.previous !== undefined ? { previous: dto.previous === '' ? null : dto.previous } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'economic_event.update',
      entity: 'EconomicEvent',
      entityId: id,
    });
    return toView(row);
  }

  async remove(actorId: string, id: string): Promise<{ id: string }> {
    await this.ensureExists(id);
    await this.prisma.economicEvent.delete({ where: { id } });
    await this.audit.record({
      userId: actorId,
      action: 'economic_event.delete',
      entity: 'EconomicEvent',
      entityId: id,
    });
    return { id };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.economicEvent.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Event not found');
  }
}

function toView(row: {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: EconomicImpact;
  eventAt: Date;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  enabled: boolean;
}): EventView {
  return {
    id: row.id,
    title: row.title,
    country: row.country,
    currency: row.currency,
    impact: row.impact,
    eventAt: row.eventAt.toISOString(),
    actual: row.actual,
    forecast: row.forecast,
    previous: row.previous,
    enabled: row.enabled,
  };
}
