import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminPartnersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Read-only partner list (v1 stub). Commission setup and referral linkage
   * land in a later phase; for now we surface PARTNER users.
   */
  listPartners() {
    return this.prisma.user.findMany({
      where: { role: UserRole.PARTNER },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, firstName: true, lastName: true, email: true, country: true, status: true, createdAt: true,
        partnerProfile: { select: { referralCode: true } },
        _count: { select: { referredClients: true } },
      },
    });
  }
}
