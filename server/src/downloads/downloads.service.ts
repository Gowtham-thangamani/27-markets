import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateDownloadDto, UpdateDownloadDto } from './dto';

export interface DownloadView {
  id: string;
  name: string;
  platform: string;
  description: string;
  size: string;
  version: string;
  icon: string;
  url: string | null;
  sortOrder: number;
  enabled: boolean;
}

// Stable ordering for both public and admin lists.
const ORDER = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];

@Injectable()
export class DownloadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ───────────── Public ─────────────

  /** Enabled items only, for the client Downloads page. */
  async listPublic(): Promise<DownloadView[]> {
    const rows = await this.prisma.downloadItem.findMany({
      where: { enabled: true },
      orderBy: ORDER,
    });
    return rows.map(toView);
  }

  // ───────────── Admin ─────────────

  /** Everything, including disabled items, for the CRM. */
  async listAll(): Promise<DownloadView[]> {
    const rows = await this.prisma.downloadItem.findMany({ orderBy: ORDER });
    return rows.map(toView);
  }

  async create(actorId: string, dto: CreateDownloadDto): Promise<DownloadView> {
    const row = await this.prisma.downloadItem.create({
      data: {
        name: dto.name,
        platform: dto.platform,
        description: dto.description,
        size: dto.size ?? '—',
        version: dto.version ?? '',
        icon: dto.icon ?? 'desktop',
        url: dto.url ?? null,
        sortOrder: dto.sortOrder ?? 0,
        enabled: dto.enabled ?? true,
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'download.create',
      entity: 'DownloadItem',
      entityId: row.id,
      metadata: { name: row.name },
    });
    return toView(row);
  }

  async update(actorId: string, id: string, dto: UpdateDownloadDto): Promise<DownloadView> {
    await this.ensureExists(id);
    const row = await this.prisma.downloadItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.platform !== undefined ? { platform: dto.platform } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.size !== undefined ? { size: dto.size } : {}),
        ...(dto.version !== undefined ? { version: dto.version } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        // Empty string clears the URL; a real URL sets it; undefined leaves it.
        ...(dto.url !== undefined ? { url: dto.url === '' ? null : dto.url } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
    await this.audit.record({
      userId: actorId,
      action: 'download.update',
      entity: 'DownloadItem',
      entityId: id,
    });
    return toView(row);
  }

  async remove(actorId: string, id: string): Promise<{ id: string }> {
    await this.ensureExists(id);
    await this.prisma.downloadItem.delete({ where: { id } });
    await this.audit.record({
      userId: actorId,
      action: 'download.delete',
      entity: 'DownloadItem',
      entityId: id,
    });
    return { id };
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.downloadItem.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Download not found');
  }
}

function toView(row: {
  id: string;
  name: string;
  platform: string;
  description: string;
  size: string;
  version: string;
  icon: string;
  url: string | null;
  sortOrder: number;
  enabled: boolean;
}): DownloadView {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    description: row.description,
    size: row.size,
    version: row.version,
    icon: row.icon,
    url: row.url,
    sortOrder: row.sortOrder,
    enabled: row.enabled,
  };
}
