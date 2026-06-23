import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateTicketDto, AddMessageDto } from './dto';

/** Client-facing support tickets. Clients only ever see their own tickets. */
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listMine(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        subject: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
  }

  async getMine(userId: string, id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        // Hide internal staff notes from the client view.
        messages: {
          where: { internal: false },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { firstName: true, lastName: true, role: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) throw new ForbiddenException('Not your ticket');
    return ticket;
  }

  async create(userId: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        userId,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority,
        messages: { create: [{ authorId: userId, body: dto.message }] },
      },
    });
    await this.audit.record({ userId, action: 'support.ticket.create', entity: 'Ticket', entityId: ticket.id });
    return ticket;
  }

  async addMessage(userId: string, id: string, dto: AddMessageDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) throw new ForbiddenException('Not your ticket');

    const message = await this.prisma.ticketMessage.create({
      data: { ticketId: id, authorId: userId, body: dto.body },
    });
    // A client reply re-opens a resolved ticket.
    await this.prisma.ticket.update({
      where: { id },
      data: { status: ticket.status === TicketStatus.RESOLVED ? TicketStatus.OPEN : ticket.status, updatedAt: new Date() },
    });
    return message;
  }
}
