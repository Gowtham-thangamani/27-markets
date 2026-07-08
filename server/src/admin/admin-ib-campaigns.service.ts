import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateIbCampaignDto, UpdateIbCampaignDto } from './ib-campaign-dto';

@Injectable()
export class AdminIbCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.ibCampaign.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async create(adminId: string, dto: CreateIbCampaignDto) {
    try {
      const campaign = await this.prisma.ibCampaign.create({
        data: {
          name: dto.name,
          code: dto.code.toUpperCase(),
          description: dto.description ?? null,
          enabled: dto.enabled ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      await this.audit.record({ userId: adminId, action: 'ib.campaign.create', entity: 'IbCampaign', entityId: campaign.id, metadata: { code: campaign.code } });
      return campaign;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('That campaign code is already in use.');
      }
      throw e;
    }
  }

  async update(adminId: string, id: string, dto: UpdateIbCampaignDto) {
    await this.assertExists(id);
    try {
      const campaign = await this.prisma.ibCampaign.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.code !== undefined ? { code: dto.code.toUpperCase() } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
      await this.audit.record({ userId: adminId, action: 'ib.campaign.update', entity: 'IbCampaign', entityId: id, metadata: { ...dto } });
      return campaign;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('That campaign code is already in use.');
      }
      throw e;
    }
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.ibCampaign.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'ib.campaign.delete', entity: 'IbCampaign', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const c = await this.prisma.ibCampaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('IB campaign not found');
    return c;
  }
}
