import { toMoney } from '../ledger/money';
import { AdminCrmService } from './admin-crm.service';

// Unit tests for the CRM service's client methods. Prisma/ledger/audit are
// mocked; constructor order is (prisma, ledger, audit).

describe('AdminCrmService — clients', () => {
  it('listClients filters to CLIENT role and adds a case-insensitive OR search', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { user: { findMany } } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any, { create: jest.fn() } as any);

    await service.listClients('ada');

    const arg = findMany.mock.calls[0][0];
    expect(arg.where.role).toBe('CLIENT');
    expect(arg.where.OR).toEqual([
      { email: { contains: 'ada', mode: 'insensitive' } },
      { firstName: { contains: 'ada', mode: 'insensitive' } },
      { lastName: { contains: 'ada', mode: 'insensitive' } },
    ]);
  });

  it('listClients omits the OR filter when no search is given', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { user: { findMany } } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any, { create: jest.fn() } as any);

    await service.listClients();

    expect(findMany.mock.calls[0][0].where.OR).toBeUndefined();
  });

  it('listClients applies a status filter when provided', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { user: { findMany } } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any, { create: jest.fn() } as any);

    await service.listClients(undefined, 'SUSPENDED' as any);

    expect(findMany.mock.calls[0][0].where.status).toBe('SUSPENDED');
  });

  it('setSalesAgent assigns a staff agent to a client and audits it', async () => {
    const update = jest.fn().mockResolvedValue({});
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      user: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ role: 'CLIENT' })   // the client
          .mockResolvedValueOnce({ role: 'AGENT' }),    // the agent
        update,
      },
    } as any;
    const service = new AdminCrmService(prisma, {} as any, { record } as any, { create: jest.fn() } as any);

    const res = await service.setSalesAgent('admin1', 'c1', 'agent1');

    expect(update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { assignedAgentId: 'agent1' } });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'crm.client.sales-agent', entityId: 'c1' }));
    expect(res).toEqual({ ok: true, assignedAgentId: 'agent1' });
  });

  it('setSalesAgent clears the assignment when agentId is null', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ role: 'CLIENT' }), update } } as any;
    const service = new AdminCrmService(prisma, {} as any, { record: jest.fn() } as any, { create: jest.fn() } as any);
    await service.setSalesAgent('admin1', 'c1', null);
    expect(update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { assignedAgentId: null } });
  });

  it('setSalesAgent rejects a non-staff agent', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValueOnce({ role: 'CLIENT' }).mockResolvedValueOnce({ role: 'CLIENT' }), update: jest.fn() },
    } as any;
    const service = new AdminCrmService(prisma, {} as any, { record: jest.fn() } as any, { create: jest.fn() } as any);
    await expect(service.setSalesAgent('admin1', 'c1', 'notStaff')).rejects.toThrow(/staff member/i);
  });

  it('setClientStatus blocks a client and writes an audit record', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'c1', status: 'SUSPENDED' });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', role: 'CLIENT' }), update },
    } as any;
    const service = new AdminCrmService(prisma, {} as any, { record } as any, { create: jest.fn() } as any);

    const res = await service.setClientStatus('admin1', 'c1', 'SUSPENDED' as any);

    expect(update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { status: 'SUSPENDED' } });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin1', action: 'crm.client.status', entityId: 'c1', metadata: { status: 'SUSPENDED' } }),
    );
    expect(res).toEqual({ id: 'c1', status: 'SUSPENDED' });
  });

  it('setClientStatus refuses a non-client user', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'x', role: 'ADMIN' }) },
    } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any, { create: jest.fn() } as any);

    await expect(service.setClientStatus('admin1', 'x', 'SUSPENDED' as any)).rejects.toThrow('Client not found');
  });

  it('getClient throws NotFound for a non-client user', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'x', role: 'ADMIN' }) },
    } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any, { create: jest.fn() } as any);

    await expect(service.getClient('x')).rejects.toThrow('Client not found');
  });

  it('addClientNote persists the note and writes an audit record', async () => {
    const create = jest.fn().mockResolvedValue({});
    const record = jest.fn().mockResolvedValue(undefined);
    const findUnique = jest.fn().mockResolvedValue({
      id: 'c1',
      role: 'CLIENT',
      firstName: 'Ada',
      lastName: 'Lovelace',
      tradingAccounts: [],
      kycProfile: null,
      clientNotesAbout: [],
      tickets: [],
    });
    const prisma = {
      clientNote: { create },
      user: { findUnique },
      kycAnswer: { findMany: jest.fn().mockResolvedValue([]) },
      kycFieldDefinition: { findMany: jest.fn().mockResolvedValue([]) },
      consent: { findMany: jest.fn().mockResolvedValue([]) },
      consentAcceptance: { findMany: jest.fn().mockResolvedValue([]) },
      // addClientNote returns getClient(), which now also loads the profile
      // history sections.
      posting: { findMany: jest.fn().mockResolvedValue([]) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      lead: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;
    const service = new AdminCrmService(prisma, {} as any, { record } as any, { create: jest.fn() } as any);

    await service.addClientNote('staff1', 'c1', { body: 'hello' });

    expect(create).toHaveBeenCalledWith({
      data: { clientId: 'c1', authorId: 'staff1', body: 'hello', pinned: false },
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'staff1', action: 'crm.client.note', entityId: 'c1' }),
    );
  });
});

describe('AdminCrmService.getClient — profile sections', () => {
  const RECENT = 20;

  const makeService = (overrides: Record<string, any> = {}) => {
    const ledgerAccountId = 'la1';
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          email: 'ada@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
          phone: null,
          country: 'UK',
          status: 'ACTIVE',
          role: 'CLIENT',
          createdAt: new Date('2026-01-01'),
          kycProfile: null,
          assignedAgentId: null,
          assignedAgent: null,
          clientNotesAbout: [],
          tickets: [],
          tradingAccounts: [
            { id: 'a1', number: 'MT5-1', type: 'STANDARD', mode: 'LIVE', status: 'ACTIVE', ledgerAccount: { id: ledgerAccountId } },
          ],
        }),
      },
      kycAnswer: { findMany: jest.fn().mockResolvedValue([]) },
      kycFieldDefinition: { findMany: jest.fn().mockResolvedValue([]) },
      consent: { findMany: jest.fn().mockResolvedValue([]) },
      consentAcceptance: { findMany: jest.fn().mockResolvedValue([]) },
      posting: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            direction: 'CREDIT',
            amount: '250.00',
            currency: 'USD',
            createdAt: new Date('2026-02-02'),
            journalEntry: { reference: 'TX-1', kind: 'DEPOSIT', status: 'POSTED', simulated: true },
          },
        ]),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'o1', symbol: 'EURUSD', side: 'BUY', type: 'MARKET', quantity: '1', price: '1.08', status: 'FILLED', simulated: true, createdAt: new Date('2026-02-03') },
        ]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'al1', action: 'auth.login', entity: null, entityId: null, ip: '1.2.3.4', createdAt: new Date('2026-02-04') },
        ]),
      },
      lead: { findFirst: jest.fn().mockResolvedValue({ id: 'l1', source: 'WAITLIST', status: 'CONVERTED', createdAt: new Date('2025-12-01') }) },
      ...overrides,
    } as any;
    const ledger = { balanceOf: jest.fn().mockResolvedValue(toMoney(0)) } as any;
    return { service: new AdminCrmService(prisma, ledger, {} as any, { create: jest.fn() } as any), prisma };
  };

  it('returns the client money history from the ledger', async () => {
    const { service } = makeService();
    const res: any = await service.getClient('c1');
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0]).toMatchObject({ reference: 'TX-1', kind: 'DEPOSIT', direction: 'CREDIT' });
  });

  it('returns trading activity, audit entries and the originating lead', async () => {
    const { service } = makeService();
    const res: any = await service.getClient('c1');
    expect(res.orders[0]).toMatchObject({ symbol: 'EURUSD', side: 'BUY' });
    expect(res.auditLog[0]).toMatchObject({ action: 'auth.login' });
    expect(res.lead).toMatchObject({ source: 'WAITLIST' });
  });

  it('caps every section so a long-lived client cannot time the page out', async () => {
    const { service, prisma } = makeService();
    await service.getClient('c1');
    expect(prisma.posting.findMany.mock.calls[0][0].take).toBe(RECENT);
    expect(prisma.order.findMany.mock.calls[0][0].take).toBe(RECENT);
    expect(prisma.auditLog.findMany.mock.calls[0][0].take).toBe(RECENT);
  });

  it('scopes the money history to this client ledger accounts only', async () => {
    const { service, prisma } = makeService();
    await service.getClient('c1');
    expect(prisma.posting.findMany.mock.calls[0][0].where.ledgerAccountId).toEqual({ in: ['la1'] });
  });

  it('skips the ledger query entirely when the client has no accounts', async () => {
    const { service, prisma } = makeService({
      user: { findUnique: jest.fn().mockResolvedValue({
        id: 'c1', email: 'a@b.c', firstName: 'A', lastName: 'B', phone: null, country: null,
        status: 'ACTIVE', role: 'CLIENT', createdAt: new Date(), kycProfile: null,
        assignedAgentId: null, assignedAgent: null, clientNotesAbout: [], tickets: [], tradingAccounts: [],
      }) },
    });
    const res: any = await service.getClient('c1');
    expect(prisma.posting.findMany).not.toHaveBeenCalled();
    expect(res.transactions).toEqual([]);
  });
});
