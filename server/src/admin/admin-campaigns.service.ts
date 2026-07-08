import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateCampaignDto, UpdateCampaignDto } from './campaign-dto';

@Injectable()
export class AdminCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(adminId: string, dto: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        channel: dto.channel ?? 'EMAIL',
        audience: dto.audience ?? 'All clients',
        subject: dto.subject ?? null,
        message: dto.message,
        status: dto.status ?? 'DRAFT',
      },
    });
    await this.audit.record({ userId: adminId, action: 'campaign.create', entity: 'Campaign', entityId: campaign.id, metadata: { name: campaign.name } });
    return campaign;
  }

  async update(adminId: string, id: string, dto: UpdateCampaignDto) {
    await this.assertExists(id);
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.channel !== undefined ? { channel: dto.channel } : {}),
        ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.message !== undefined ? { message: dto.message } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
    await this.audit.record({ userId: adminId, action: 'campaign.update', entity: 'Campaign', entityId: id, metadata: { ...dto } });
    return campaign;
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.campaign.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'campaign.delete', entity: 'Campaign', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }
}
