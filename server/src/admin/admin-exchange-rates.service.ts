import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateExchangeRateDto, UpdateExchangeRateDto } from './exchange-rate-dto';

@Injectable()
export class AdminExchangeRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const rows = await this.prisma.exchangeRate.findMany({ orderBy: [{ base: 'asc' }, { quote: 'asc' }] });
    return rows.map((r) => ({ ...r, rate: r.rate.toString() }));
  }

  async create(adminId: string, dto: CreateExchangeRateDto) {
    const base = dto.base.toUpperCase();
    const quote = dto.quote.toUpperCase();
    if (base === quote) throw new BadRequestException('Base and quote must differ.');
    try {
      const row = await this.prisma.exchangeRate.create({ data: { base, quote, rate: new Prisma.Decimal(dto.rate) } });
      await this.audit.record({ userId: adminId, action: 'fx.rate.create', entity: 'ExchangeRate', entityId: row.id, metadata: { base, quote, rate: dto.rate } });
      return { ...row, rate: row.rate.toString() };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException(`A rate for ${base}/${quote} already exists.`);
      }
      throw e;
    }
  }

  async update(adminId: string, id: string, dto: UpdateExchangeRateDto) {
    await this.assertExists(id);
    const row = await this.prisma.exchangeRate.update({
      where: { id },
      data: { ...(dto.rate !== undefined ? { rate: new Prisma.Decimal(dto.rate) } : {}) },
    });
    await this.audit.record({ userId: adminId, action: 'fx.rate.update', entity: 'ExchangeRate', entityId: id, metadata: { rate: dto.rate } });
    return { ...row, rate: row.rate.toString() };
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.exchangeRate.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'fx.rate.delete', entity: 'ExchangeRate', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const r = await this.prisma.exchangeRate.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Exchange rate not found');
    return r;
  }
}
