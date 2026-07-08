import { AccountStatus } from '@prisma/client';
import { AdminAccountsService } from './admin-accounts.service';

// Constructor order: (prisma, ledger, audit)

describe('AdminAccountsService', () => {
  it('setStatus updates the account and audits it', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'a1', status: AccountStatus.SUSPENDED });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'a1' }), update },
    } as any;
    const service = new AdminAccountsService(prisma, {} as any, { record } as any);

    const result = await service.setStatus('admin1', 'a1', AccountStatus.SUSPENDED);

    expect(update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: AccountStatus.SUSPENDED } });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'accounts.status', entityId: 'a1' }));
    expect(result).toEqual({ id: 'a1', status: AccountStatus.SUSPENDED });
  });

  it('setLeverage updates the account and audits it', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'a1', leverage: '1:200' });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'a1' }), update },
    } as any;
    const service = new AdminAccountsService(prisma, {} as any, { record } as any);

    const result = await service.setLeverage('admin1', 'a1', '1:200');

    expect(update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { leverage: '1:200' } });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'accounts.leverage', entityId: 'a1' }));
    expect(result).toEqual({ id: 'a1', leverage: '1:200' });
  });

  it('throws NotFound when the account does not exist', async () => {
    const prisma = { tradingAccount: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminAccountsService(prisma, {} as any, {} as any);
    await expect(service.setStatus('admin1', 'missing', AccountStatus.ACTIVE)).rejects.toThrow('Account not found');
  });

  it('listDormant returns only accounts with no recent activity', async () => {
    const owner = { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com' };
    const findMany = jest.fn().mockResolvedValue([
      // Last activity long ago → dormant.
      { id: 'a1', number: '100', type: 'STANDARD', mode: 'LIVE', status: 'ACTIVE', currency: 'USD', createdAt: new Date('2025-01-01'), ledgerAccount: { id: 'la1' }, user: owner },
      // Created just now, no activity → active, excluded.
      { id: 'a2', number: '200', type: 'VIP', mode: 'LIVE', status: 'ACTIVE', currency: 'USD', createdAt: new Date(), ledgerAccount: { id: 'la2' }, user: owner },
    ]);
    const groupBy = jest.fn().mockResolvedValue([{ ledgerAccountId: 'la1', _max: { createdAt: new Date('2025-02-01') } }]);
    const prisma = { tradingAccount: { findMany }, posting: { groupBy } } as any;
    const ledger = { balanceOf: jest.fn().mockResolvedValue(0) } as any;
    const service = new AdminAccountsService(prisma, ledger, {} as any);

    const rows = await service.listDormant();

    expect(rows.map((r) => r.id)).toEqual(['a1']);
    expect(rows[0]).toMatchObject({ number: '100', owner: { name: 'Ada Lovelace' } });
    expect(rows[0].daysInactive).toBeGreaterThan(90);
  });
});
