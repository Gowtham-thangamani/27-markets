import { AdminCrmService } from './admin-crm.service';

// Unit tests for the CRM service's client methods. Prisma/ledger/audit are
// mocked; constructor order is (prisma, ledger, audit).

describe('AdminCrmService — clients', () => {
  it('listClients filters to CLIENT role and adds a case-insensitive OR search', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { user: { findMany } } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any);

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
    const service = new AdminCrmService(prisma, {} as any, {} as any);

    await service.listClients();

    expect(findMany.mock.calls[0][0].where.OR).toBeUndefined();
  });

  it('listClients applies a status filter when provided', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { user: { findMany } } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any);

    await service.listClients(undefined, 'SUSPENDED' as any);

    expect(findMany.mock.calls[0][0].where.status).toBe('SUSPENDED');
  });

  it('setClientStatus blocks a client and writes an audit record', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'c1', status: 'SUSPENDED' });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', role: 'CLIENT' }), update },
    } as any;
    const service = new AdminCrmService(prisma, {} as any, { record } as any);

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
    const service = new AdminCrmService(prisma, {} as any, {} as any);

    await expect(service.setClientStatus('admin1', 'x', 'SUSPENDED' as any)).rejects.toThrow('Client not found');
  });

  it('getClient throws NotFound for a non-client user', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'x', role: 'ADMIN' }) },
    } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any);

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
    } as any;
    const service = new AdminCrmService(prisma, {} as any, { record } as any);

    await service.addClientNote('staff1', 'c1', { body: 'hello' });

    expect(create).toHaveBeenCalledWith({
      data: { clientId: 'c1', authorId: 'staff1', body: 'hello', pinned: false },
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'staff1', action: 'crm.client.note', entityId: 'c1' }),
    );
  });
});
