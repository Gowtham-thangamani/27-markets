import { AccountsService } from './accounts.service';

describe('AccountsService.create — live rail', () => {
  const make = (allowLive: boolean) => {
    const prisma = {
      accountTypeConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      tradingAccount: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
    } as any;
    const config = { get: jest.fn().mockReturnValue(allowLive) } as any;
    return { service: new AccountsService(prisma, {} as any, {} as any, config), prisma };
  };

  it('blocks creating a LIVE account while the live rail is off', async () => {
    const { service, prisma } = make(false);
    await expect(service.create('u1', 'STANDARD' as any, 'LIVE' as any)).rejects.toThrow(/live accounts are not available/i);
    expect(prisma.tradingAccount.create).not.toHaveBeenCalled();
  });

  it('does not block DEMO account creation', async () => {
    const { service } = make(false);
    // DEMO proceeds past the rail check (may fail later on unmocked ledger calls,
    // but must NOT throw the live-rail error).
    await expect(service.create('u1', 'STANDARD' as any, 'DEMO' as any)).rejects.not.toThrow(/live accounts are not available/i);
  });
});
