import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateServerDto, UpdateServerDto } from './server-dto';

@Injectable()
export class AdminServersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.tradingServer.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async create(adminId: string, dto: CreateServerDto) {
    const server = await this.prisma.tradingServer.create({
      data: {
        name: dto.name,
        host: dto.host,
        platform: dto.platform ?? 'MT5',
        environment: dto.environment ?? 'LIVE',
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.record({ userId: adminId, action: 'trading.server.create', entity: 'TradingServer', entityId: server.id, metadata: { name: server.name } });
    return server;
  }

  async update(adminId: string, id: string, dto: UpdateServerDto) {
    await this.assertExists(id);
    const server = await this.prisma.tradingServer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.host !== undefined ? { host: dto.host } : {}),
        ...(dto.platform !== undefined ? { platform: dto.platform } : {}),
        ...(dto.environment !== undefined ? { environment: dto.environment } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.record({ userId: adminId, action: 'trading.server.update', entity: 'TradingServer', entityId: id, metadata: { ...dto } });
    return server;
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.tradingServer.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'trading.server.delete', entity: 'TradingServer', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const s = await this.prisma.tradingServer.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Server not found');
    return s;
  }
}
