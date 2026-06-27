import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { UpdateProfileDto } from './dto';

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
    };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({ where: { id: userId }, data: dto });
    await this.audit.record({ userId, action: 'profile.update', entity: 'User', entityId: userId });
    return this.profile(userId);
  }
}
