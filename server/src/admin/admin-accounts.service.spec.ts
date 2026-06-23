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
});
