import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Roles an admin may assign through the CRM. CLIENT/PARTNER are managed elsewhere.
const ASSIGNABLE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.AGENT];

@Injectable()
export class AdminStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Staff users (ADMIN + AGENT). */
  listStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: ASSIGNABLE_ROLES } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true, createdAt: true },
    });
  }

  async setRole(adminId: string, userId: string, role: UserRole) {
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new BadRequestException('Role must be ADMIN or AGENT');
    }
    if (userId === adminId) {
      throw new BadRequestException('You cannot change your own role');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.audit.record({
      userId: adminId,
      action: 'staff.role',
      entity: 'User',
      entityId: userId,
      metadata: { from: user.role, to: role },
    });
    return { id: updated.id, role: updated.role };
  }

  /** Recent audit-log entries (optionally filtered by action), with the actor. */
  auditLog(action?: string) {
    return this.prisma.auditLog.findMany({
      where: action ? { action } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  }
}
