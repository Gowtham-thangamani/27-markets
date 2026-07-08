import { AdminAccountTypesService } from './admin-account-types.service';

// Constructor order: (prisma, audit).
describe('AdminAccountTypesService', () => {
  it('lists configs ordered by sortOrder', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { accountTypeConfig: { findMany } } as any;
    const service = new AdminAccountTypesService(prisma, {} as any);

    await service.list();

    expect(findMany).toHaveBeenCalledWith({ orderBy: { sortOrder: 'asc' } });
  });

  it('update applies only provided fields and audits the change', async () => {
    const update = jest.fn().mockResolvedValue({ type: 'STANDARD', leverage: '1:20' });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      accountTypeConfig: { findUnique: jest.fn().mockResolvedValue({ type: 'STANDARD' }), update },
    } as any;
    const service = new AdminAccountTypesService(prisma, { record } as any);

    await service.update('admin1', 'STANDARD' as any, { leverage: '1:20' });

    expect(update).toHaveBeenCalledWith({ where: { type: 'STANDARD' }, data: { leverage: '1:20' } });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin1', action: 'accounts.type.update', entityId: 'STANDARD' }),
    );
  });

  it('update throws NotFound for an unknown type', async () => {
    const prisma = { accountTypeConfig: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminAccountTypesService(prisma, {} as any);

    await expect(service.update('admin1', 'VIP' as any, { leverage: '1:20' })).rejects.toThrow('Account type not found');
  });
});
