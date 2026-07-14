import { TicketStatus } from '@prisma/client';
import { SupportService } from './support.service';

// Constructor order: (prisma, audit)

describe('SupportService.getMine', () => {
  it('throws NotFound when the ticket does not exist', async () => {
    const prisma = { ticket: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new SupportService(prisma, {} as any, { create: jest.fn() } as any);
    await expect(service.getMine('u1', 't1')).rejects.toThrow('Ticket not found');
  });

  it('forbids viewing another user\'s ticket', async () => {
    const prisma = { ticket: { findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'someone-else', messages: [] }) } } as any;
    const service = new SupportService(prisma, {} as any, { create: jest.fn() } as any);
    await expect(service.getMine('u1', 't1')).rejects.toThrow('Not your ticket');
  });

  it('requests only non-internal messages (hides staff notes)', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 't1', userId: 'u1', messages: [] });
    const prisma = { ticket: { findUnique } } as any;
    const service = new SupportService(prisma, {} as any, { create: jest.fn() } as any);

    await service.getMine('u1', 't1');

    expect(findUnique.mock.calls[0][0].include.messages.where).toEqual({ internal: false });
  });
});

describe('SupportService.create', () => {
  it('creates the ticket with the first message and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 't1' });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = { ticket: { create } } as any;
    const service = new SupportService(prisma, { record } as any, { create: jest.fn() } as any);

    await service.create('u1', { subject: 'Help', category: 'Account', priority: 'MEDIUM', message: 'hi there' } as any);

    const data = create.mock.calls[0][0].data;
    expect(data.userId).toBe('u1');
    expect(data.messages.create).toEqual([{ authorId: 'u1', body: 'hi there' }]);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'support.ticket.create', entityId: 't1' }));
  });
});

describe('SupportService.addMessage', () => {
  it('re-opens a RESOLVED ticket when the client replies', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      ticket: { findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1', status: TicketStatus.RESOLVED }), update },
      ticketMessage: { create: jest.fn().mockResolvedValue({ id: 'm1' }) },
    } as any;
    const service = new SupportService(prisma, {} as any, { create: jest.fn() } as any);

    await service.addMessage('u1', 't1', { body: 'still broken' } as any);

    expect(update.mock.calls[0][0].data.status).toBe(TicketStatus.OPEN);
  });

  it('forbids replying to another user\'s ticket', async () => {
    const prisma = {
      ticket: { findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'other', status: TicketStatus.OPEN }) },
    } as any;
    const service = new SupportService(prisma, {} as any, { create: jest.fn() } as any);
    await expect(service.addMessage('u1', 't1', { body: 'x' } as any)).rejects.toThrow('Not your ticket');
  });
});
