import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type {
  CreateTestimonialDto,
  UpdateTestimonialDto,
  CreateDfmSymbolDto,
  UpdateDfmSymbolDto,
} from './dto';

export interface TestimonialView {
  id: string;
  name: string;
  initials: string;
  quote: string;
  enabled: boolean;
  sortOrder: number;
}

export interface DfmSymbolView {
  id: string;
  symbol: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
}

const ORDER = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];

@Injectable()
export class SiteContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────────── Testimonials ─────────────

  async listPublicTestimonials(): Promise<TestimonialView[]> {
    const rows = await this.prisma.testimonial.findMany({
      where: { enabled: true },
      orderBy: ORDER,
    });
    return rows.map(toTestimonial);
  }

  async listAllTestimonials(): Promise<TestimonialView[]> {
    const rows = await this.prisma.testimonial.findMany({ orderBy: ORDER });
    return rows.map(toTestimonial);
  }

  async createTestimonial(actorId: string, dto: CreateTestimonialDto): Promise<TestimonialView> {
    const row = await this.prisma.testimonial.create({
      data: {
        name: dto.name,
        initials: dto.initials,
        quote: dto.quote,
        sortOrder: dto.sortOrder ?? 0,
        enabled: dto.enabled ?? true,
      },
    });
    await this.log(actorId, 'testimonial.create', 'Testimonial', row.id);
    return toTestimonial(row);
  }

  async updateTestimonial(
    actorId: string,
    id: string,
    dto: UpdateTestimonialDto,
  ): Promise<TestimonialView> {
    await this.ensure('testimonial', id);
    const row = await this.prisma.testimonial.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.initials !== undefined ? { initials: dto.initials } : {}),
        ...(dto.quote !== undefined ? { quote: dto.quote } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
    await this.log(actorId, 'testimonial.update', 'Testimonial', id);
    return toTestimonial(row);
  }

  async removeTestimonial(actorId: string, id: string): Promise<{ id: string }> {
    await this.ensure('testimonial', id);
    await this.prisma.testimonial.delete({ where: { id } });
    await this.log(actorId, 'testimonial.delete', 'Testimonial', id);
    return { id };
  }

  // ───────────── DFM symbols ─────────────

  async listPublicDfm(): Promise<DfmSymbolView[]> {
    const rows = await this.prisma.dfmSymbol.findMany({
      where: { enabled: true },
      orderBy: ORDER,
    });
    return rows.map(toDfm);
  }

  async listAllDfm(): Promise<DfmSymbolView[]> {
    const rows = await this.prisma.dfmSymbol.findMany({ orderBy: ORDER });
    return rows.map(toDfm);
  }

  async createDfm(actorId: string, dto: CreateDfmSymbolDto): Promise<DfmSymbolView> {
    const row = await this.prisma.dfmSymbol.create({
      data: {
        symbol: dto.symbol,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
        enabled: dto.enabled ?? true,
      },
    });
    await this.log(actorId, 'dfm_symbol.create', 'DfmSymbol', row.id);
    return toDfm(row);
  }

  async updateDfm(actorId: string, id: string, dto: UpdateDfmSymbolDto): Promise<DfmSymbolView> {
    await this.ensure('dfmSymbol', id);
    const row = await this.prisma.dfmSymbol.update({
      where: { id },
      data: {
        ...(dto.symbol !== undefined ? { symbol: dto.symbol } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
    await this.log(actorId, 'dfm_symbol.update', 'DfmSymbol', id);
    return toDfm(row);
  }

  async removeDfm(actorId: string, id: string): Promise<{ id: string }> {
    await this.ensure('dfmSymbol', id);
    await this.prisma.dfmSymbol.delete({ where: { id } });
    await this.log(actorId, 'dfm_symbol.delete', 'DfmSymbol', id);
    return { id };
  }

  // ───────────── helpers ─────────────

  private async ensure(model: 'testimonial' | 'dfmSymbol', id: string): Promise<void> {
    const found =
      model === 'testimonial'
        ? await this.prisma.testimonial.findUnique({ where: { id }, select: { id: true } })
        : await this.prisma.dfmSymbol.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Not found');
  }

  private log(userId: string, action: string, entity: string, entityId: string) {
    return this.audit.record({ userId, action, entity, entityId });
  }
}

function toTestimonial(row: {
  id: string;
  name: string;
  initials: string;
  quote: string;
  enabled: boolean;
  sortOrder: number;
}): TestimonialView {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    quote: row.quote,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}

function toDfm(row: {
  id: string;
  symbol: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
}): DfmSymbolView {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}
