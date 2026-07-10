import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateInstrumentDto, UpdateInstrumentDto } from './dto';

export interface InstrumentView {
  id: string;
  symbol: string;
  name: string;
  category: string;
  feed: string | null;
  spread: number;
  enabled: boolean;
  sortOrder: number;
}

const ORDER = [{ sortOrder: 'asc' as const }, { symbol: 'asc' as const }];

@Injectable()
export class InstrumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────────── Public ─────────────

  /** Enabled instruments for the client (markets page + trade terminal). */
  async listPublic(): Promise<InstrumentView[]> {
    const rows = await this.prisma.tradingInstrument.findMany({
      where: { enabled: true },
      orderBy: ORDER,
    });
    return rows.map(toView);
  }

  // ───────────── Admin ─────────────

  async listAll(): Promise<InstrumentView[]> {
    const rows = await this.prisma.tradingInstrument.findMany({ orderBy: ORDER });
    return rows.map(toView);
  }

  async create(actorId: string, dto: CreateInstrumentDto): Promise<InstrumentView> {
    const row = await this.prisma.tradingInstrument.create({
      data: {
        symbol: dto.symbol,
        name: dto.name,
        category: dto.category,
        feed: dto.feed ?? null,
        spread: dto.spread ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        enabled: dto.enabled ?? true,
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'instrument.create',
      entity: 'TradingInstrument',
      entityId: row.id,
      metadata: { symbol: row.symbol },
    });
    return toView(row);
  }

  async update(actorId: string, id: string, dto: UpdateInstrumentDto): Promise<InstrumentView> {
    await this.ensureExists(id);
    const row = await this.prisma.tradingInstrument.update({
      where: { id },
      data: {
        ...(dto.symbol !== undefined ? { symbol: dto.symbol } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.feed !== undefined ? { feed: dto.feed === '' ? null : dto.feed } : {}),
        ...(dto.spread !== undefined ? { spread: dto.spread } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'instrument.update',
      entity: 'TradingInstrument',
      entityId: id,
    });
    return toView(row);
  }

  async remove(actorId: string, id: string): Promise<{ id: string }> {
    await this.ensureExists(id);
    await this.prisma.tradingInstrument.delete({ where: { id } });
    await this.audit.record({
      userId: actorId,
      action: 'instrument.delete',
      entity: 'TradingInstrument',
      entityId: id,
    });
    return { id };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.tradingInstrument.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Instrument not found');
  }
}

function toView(row: {
  id: string;
  symbol: string;
  name: string;
  category: string;
  feed: string | null;
  spread: number;
  enabled: boolean;
  sortOrder: number;
}): InstrumentView {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    category: row.category,
    feed: row.feed,
    spread: row.spread,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}
