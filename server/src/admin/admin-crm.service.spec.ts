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
    const prisma = { clientNote: { create }, user: { findUnique } } as any;
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
