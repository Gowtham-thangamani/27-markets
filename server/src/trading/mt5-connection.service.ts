import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Mt5ProvisioningClient } from './mt5-provisioning.client';
import type { ConnectMt5Dto } from './trading.dto';

/**
 * Links a client's own MT5 account (account-linking model). The MT5 password is
 * sent to MetaApi to provision and is NEVER stored — we keep only the returned
 * account id + display fields. Each client's trades route to their account id.
 */
@Injectable()
export class Mt5ConnectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: Mt5ProvisioningClient,
    private readonly audit: AuditService,
  ) {}

  async getMine(userId: string) {
    const c = await this.prisma.mt5Connection.findUnique({ where: { userId } });
    if (!c) return null;
    return { login: c.login, server: c.server, status: c.status, linked: !!c.mt5AccountId, error: c.error, updatedAt: c.updatedAt };
  }

  async connect(userId: string, dto: ConnectMt5Dto) {
    let status: 'PENDING' | 'CONNECTED' | 'FAILED' = 'PENDING';
    let mt5AccountId: string | null = null;
    let error: string | null = null;

    if (this.provisioning.configured) {
      try {
        const { id } = await this.provisioning.provisionAccount({
          login: dto.login,
          password: dto.password,
          server: dto.server,
          name: `client-${userId}`,
        });
        mt5AccountId = id;
        status = 'CONNECTED';
      } catch (e) {
        status = 'FAILED';
        error = (e as Error).message;
      }
    }
    // password is intentionally discarded — never persisted.

    const data = { login: dto.login, server: dto.server, mt5AccountId, status, error };
    const conn = await this.prisma.mt5Connection.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    await this.audit.record({ userId, action: 'mt5.connect', entity: 'Mt5Connection', entityId: conn.id, metadata: { login: dto.login, server: dto.server, status } });

    if (status === 'FAILED') throw new ServiceUnavailableException(error ?? 'MT5 connection failed.');
    return this.getMine(userId);
  }

  async disconnect(userId: string) {
    await this.prisma.mt5Connection.deleteMany({ where: { userId } });
    await this.audit.record({ userId, action: 'mt5.disconnect', entity: 'Mt5Connection' });
    return { ok: true };
  }

  /** The user's live MT5 account id for routing trades, or undefined if not connected. */
  async accountIdFor(userId: string): Promise<string | undefined> {
    const c = await this.prisma.mt5Connection.findUnique({ where: { userId } });
    return c?.status === 'CONNECTED' && c.mt5AccountId ? c.mt5AccountId : undefined;
  }
}
