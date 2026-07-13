import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateDataChangeRequestDto, UpdateProfileDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      country: user.country,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      emailVerified: user.emailVerified,
      joinedAt: user.createdAt,
      notifySecurity: user.notifySecurity,
      notifyProduct: user.notifyProduct,
      notifyMarketing: user.notifyMarketing,
    };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({ where: { id: userId }, data: dto });
    await this.audit.record({ userId, action: 'profile.update', entity: 'User', entityId: userId });
    return this.profile(userId);
  }

  /** The signed-in client's own data-change requests. */
  listMyChangeRequests(userId: string) {
    return this.prisma.dataChangeRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  /** Submit a profile change that needs admin approval before it takes effect. */
  async createChangeRequest(userId: string, dto: CreateDataChangeRequestDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const currentValue = (user as Record<string, unknown>)[dto.field];
    const request = await this.prisma.dataChangeRequest.create({
      data: {
        userId,
        field: dto.field,
        currentValue: currentValue == null ? null : String(currentValue),
        requestedValue: dto.requestedValue,
      },
    });
    await this.audit.record({ userId, action: 'data-change.submit', entity: 'DataChangeRequest', entityId: request.id, metadata: { field: dto.field } });
    return request;
  }
}
