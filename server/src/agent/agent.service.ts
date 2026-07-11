import { Injectable } from '@nestjs/common';
import { LeadStatus, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AgentSummary {
  leads: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    lost: number;
  };
  tickets: { open: number; total: number };
}

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Headline counts for the agent's own book of work. */
  async summary(agentId: string): Promise<AgentSummary> {
    const [byStatus, ticketsTotal, ticketsOpen] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { assignedToId: agentId },
        _count: { _all: true },
      }),
      this.prisma.ticket.count({ where: { assignedToId: agentId } }),
      this.prisma.ticket.count({
        where: { assignedToId: agentId, status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
      }),
    ]);

    const count = (s: LeadStatus) =>
      byStatus.find((g) => g.status === s)?._count._all ?? 0;

    return {
      leads: {
        total: byStatus.reduce((sum, g) => sum + g._count._all, 0),
        new: count(LeadStatus.NEW),
        contacted: count(LeadStatus.CONTACTED),
        qualified: count(LeadStatus.QUALIFIED),
        converted: count(LeadStatus.CONVERTED),
        lost: count(LeadStatus.LOST),
      },
      tickets: { open: ticketsOpen, total: ticketsTotal },
    };
  }

  /** Leads assigned to this agent, newest first. */
  async myLeads(agentId: string) {
    const rows = await this.prisma.lead.findMany({
      where: { assignedToId: agentId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        source: true,
        status: true,
        createdAt: true,
      },
    });
    return rows.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }));
  }

  /** Support tickets assigned to this agent, most recently updated first. */
  async myTickets(agentId: string) {
    const rows = await this.prisma.ticket.findMany({
      where: { assignedToId: agentId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        subject: true,
        category: true,
        priority: true,
        status: true,
        updatedAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return rows.map((t) => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      updatedAt: t.updatedAt.toISOString(),
      client: `${t.user.firstName} ${t.user.lastName}`.trim(),
    }));
  }
}
