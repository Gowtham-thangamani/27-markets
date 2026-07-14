import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Prisma, TicketStatus, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { formatMoney, toMoney } from '../ledger/money';
import type { NoteDto, ReplyTicketDto, UpdateLeadDto, UpdateTicketDto } from './crm-dto';

@Injectable()
export class AdminCrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ───────────── Clients ─────────────

  listClients(search?: string, status?: UserStatus) {
    const where: Prisma.UserWhereInput = { role: UserRole.CLIENT };
    if (status) where.status = status;
    if (search?.trim()) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        country: true,
        status: true,
        createdAt: true,
        kycProfile: { select: { identityStatus: true, addressStatus: true, selfieStatus: true } },
        _count: { select: { tradingAccounts: true } },
      },
    });
  }

  async getClient(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        tradingAccounts: { include: { ledgerAccount: true }, orderBy: { createdAt: 'desc' } },
        kycProfile: true,
        clientNotesAbout: {
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          include: { author: { select: { firstName: true, lastName: true } } },
        },
        tickets: { orderBy: { updatedAt: 'desc' }, take: 5 },
      },
    });
    if (!user || user.role !== UserRole.CLIENT) throw new NotFoundException('Client not found');

    const accounts = await Promise.all(
      user.tradingAccounts.map(async (a) => ({
        id: a.id,
        number: a.number,
        type: a.type,
        mode: a.mode,
        status: a.status,
        balance: formatMoney(a.ledgerAccount ? await this.ledger.balanceOf(a.ledgerAccount.id) : toMoney(0)),
      })),
    );

    // KYC answers + consent acceptances (from the onboarding form).
    const [answerRows, fieldDefs, consentDefs, acceptedRows] = await Promise.all([
      this.prisma.kycAnswer.findMany({ where: { userId: id } }),
      this.prisma.kycFieldDefinition.findMany({ select: { id: true, label: true } }),
      this.prisma.consent.findMany({ where: { enabled: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, label: true } }),
      this.prisma.consentAcceptance.findMany({ where: { userId: id }, select: { consentId: true } }),
    ]);
    const fieldLabel = new Map(fieldDefs.map((f) => [f.id, f.label]));
    const kycAnswers = answerRows.map((a) => ({ label: fieldLabel.get(a.fieldId) ?? a.fieldId, value: a.value }));
    const acceptedSet = new Set(acceptedRows.map((a) => a.consentId));
    const consents = consentDefs.map((c) => ({ label: c.label, accepted: acceptedSet.has(c.id) }));

    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      phone: user.phone,
      country: user.country,
      status: user.status,
      joinedAt: user.createdAt,
      kyc: user.kycProfile,
      accounts,
      notes: user.clientNotesAbout,
      tickets: user.tickets,
      kycAnswers,
      consents,
    };
  }

  async addClientNote(authorId: string, clientId: string, dto: NoteDto) {
    await this.prisma.clientNote.create({
      data: { clientId, authorId, body: dto.body, pinned: dto.pinned ?? false },
    });
    await this.audit.record({ userId: authorId, action: 'crm.client.note', entity: 'User', entityId: clientId });
    return this.getClient(clientId);
  }

  /** Block (SUSPENDED) or unblock (ACTIVE) a client account. Admin-only. */
  async setClientStatus(adminId: string, clientId: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== UserRole.CLIENT) throw new NotFoundException('Client not found');

    const updated = await this.prisma.user.update({ where: { id: clientId }, data: { status } });
    await this.audit.record({
      userId: adminId,
      action: 'crm.client.status',
      entity: 'User',
      entityId: clientId,
      metadata: { status },
    });
    return { id: updated.id, status: updated.status };
  }

  /** All uploaded KYC documents across clients (Document Tracker). */
  async listKycDocuments() {
    const docs = await this.prisma.kycDocument.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { kycProfile: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
    });
    return docs.map((d) => ({
      id: d.id,
      step: d.step,
      fileName: d.fileName,
      mimeType: d.mimeType,
      createdAt: d.createdAt,
      owner: d.kycProfile?.user
        ? { id: d.kycProfile.user.id, name: `${d.kycProfile.user.firstName} ${d.kycProfile.user.lastName}`, email: d.kycProfile.user.email }
        : null,
    }));
  }

  /** Clients who signed up via a partner referral code (Referrals). */
  async listReferrals() {
    const users = await this.prisma.user.findMany({
      where: { referredByPartnerId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        referredByPartner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      referred: { id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email },
      referrer: u.referredByPartner
        ? { id: u.referredByPartner.id, name: `${u.referredByPartner.firstName} ${u.referredByPartner.lastName}`, email: u.referredByPartner.email }
        : null,
      joinedAt: u.createdAt,
    }));
  }

  /** Referring partners with their referral counts (User Referrals). */
  async referralSummary() {
    const partners = await this.prisma.user.findMany({
      where: { referredClients: { some: {} } },
      select: { id: true, firstName: true, lastName: true, email: true, _count: { select: { referredClients: true } } },
    });
    return partners
      .map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, email: p.email, referralCount: p._count.referredClients }))
      .sort((a, b) => b.referralCount - a.referralCount);
  }

  // ───────────── Leads ─────────────

  listLeads(status?: LeadStatus) {
    return this.prisma.lead.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        _count: { select: { notes: true } },
      },
    });
  }

  async getLead(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async updateLead(staffId: string, id: string, dto: UpdateLeadDto) {
    await this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId } : {}),
      },
    });
    await this.audit.record({ userId: staffId, action: 'crm.lead.update', entity: 'Lead', entityId: id, metadata: { status: dto.status, assignedToId: dto.assignedToId } });
    return this.getLead(id);
  }

  async addLeadNote(authorId: string, leadId: string, dto: NoteDto) {
    await this.prisma.leadNote.create({ data: { leadId, authorId, body: dto.body } });
    return this.getLead(leadId);
  }

  // ───────────── Tickets (staff view) ─────────────

  listTickets(status?: TicketStatus) {
    return this.prisma.ticket.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 200,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  async getTicket(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { firstName: true, lastName: true, role: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async updateTicket(staffId: string, id: string, dto: UpdateTicketDto) {
    await this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId } : {}),
      },
    });
    await this.audit.record({ userId: staffId, action: 'crm.ticket.update', entity: 'Ticket', entityId: id, metadata: { status: dto.status, priority: dto.priority, assignedToId: dto.assignedToId } });
    if (dto.status === TicketStatus.RESOLVED) {
      const t = await this.prisma.ticket.findUnique({ where: { id }, select: { userId: true, subject: true } });
      if (t) {
        await this.notifications.create(t.userId, {
          title: 'Support ticket resolved',
          body: `Your support ticket "${t.subject}" has been marked resolved. If you still need help, reply to re-open it.`,
          kind: 'SUCCESS',
          email: true,
        });
      }
    }
    return this.getTicket(id);
  }

  async replyTicket(staffId: string, id: string, dto: ReplyTicketDto) {
    await this.prisma.ticketMessage.create({
      data: { ticketId: id, authorId: staffId, body: dto.body, internal: dto.internal ?? false },
    });
    await this.prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.IN_PROGRESS, updatedAt: new Date() },
    });
    // Notify the client of a staff reply — but not for internal staff notes.
    if (!dto.internal) {
      const t = await this.prisma.ticket.findUnique({ where: { id }, select: { userId: true, subject: true } });
      if (t) {
        await this.notifications.create(t.userId, {
          title: 'New reply to your support ticket',
          body: `Our team replied to your ticket "${t.subject}". Sign in to your portal to read and respond.`,
          kind: 'INFO',
          email: true,
        });
      }
    }
    return this.getTicket(id);
  }

  /** Staff list for assignment dropdowns. */
  listStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.AGENT] } },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: 'asc' },
    });
  }
}
