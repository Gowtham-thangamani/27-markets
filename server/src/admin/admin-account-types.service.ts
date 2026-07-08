import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { UpdateAccountTypeDto } from './account-type-dto';

@Injectable()
export class AdminAccountTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** All account type configs, in display order. */
  list() {
    return this.prisma.accountTypeConfig.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async update(adminId: string, type: AccountType, dto: UpdateAccountTypeDto) {
    const existing = await this.prisma.accountTypeConfig.findUnique({ where: { type } });
    if (!existing) throw new NotFoundException('Account type not found');

    const updated = await this.prisma.accountTypeConfig.update({
      where: { type },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.spreadFrom !== undefined ? { spreadFrom: dto.spreadFrom } : {}),
        ...(dto.commission !== undefined ? { commission: dto.commission } : {}),
        ...(dto.leverage !== undefined ? { leverage: dto.leverage } : {}),
        ...(dto.minDeposit !== undefined ? { minDeposit: dto.minDeposit } : {}),
        ...(dto.popular !== undefined ? { popular: dto.popular } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    await this.audit.record({
      userId: adminId,
      action: 'accounts.type.update',
      entity: 'AccountTypeConfig',
      entityId: type,
      metadata: { ...dto },
    });
    return updated;
  }
}
