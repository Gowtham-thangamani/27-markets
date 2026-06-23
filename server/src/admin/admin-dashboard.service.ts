import { Injectable } from '@nestjs/common';
import {
  JournalKind,
  JournalStatus,
  KycStepStatus,
  TicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminDashboardSummary {
  totalClients: number;
  pendingKyc: number;
  pendingWithdrawals: number;
  depositsToday: number;
  openTickets: number;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<AdminDashboardSummary> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalClients, pendingKyc, pendingWithdrawals, depositsToday, openTickets] =
      await Promise.all([
        this.prisma.user.count({ where: { role: UserRole.CLIENT } }),
        this.prisma.kycProfile.count({
          where: {
            OR: [
              { identityStatus: KycStepStatus.PENDING },
              { addressStatus: KycStepStatus.PENDING },
              { selfieStatus: KycStepStatus.PENDING },
            ],
          },
        }),
        this.prisma.journalEntry.count({
          where: { kind: JournalKind.WITHDRAWAL, status: JournalStatus.PENDING },
        }),
        this.prisma.journalEntry.count({
          where: { kind: JournalKind.DEPOSIT, createdAt: { gte: startOfToday } },
        }),
        this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      ]);

    return { totalClients, pendingKyc, pendingWithdrawals, depositsToday, openTickets };
  }
}
