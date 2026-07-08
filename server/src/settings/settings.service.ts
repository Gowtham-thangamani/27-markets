import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_KEYS = [
  'company_name',
  'support_email',
  'support_hours',
  'min_deposit_usd',
  'maintenance_mode',
  'maintenance_message',
];

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Curated, client-safe settings for the marketing site + portal. */
  async publicSettings() {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { in: PUBLIC_KEYS } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      companyName: map.company_name ?? '27 Markets Ltd',
      supportEmail: map.support_email ?? 'info@27markets.com',
      supportHours: map.support_hours ?? '24/5',
      minDeposit: Number(map.min_deposit_usd ?? '50') || 50,
      maintenanceMode: (map.maintenance_mode ?? 'false') === 'true',
      maintenanceMessage: map.maintenance_message ?? '',
    };
  }
}
