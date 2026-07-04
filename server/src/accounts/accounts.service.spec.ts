import { AccountMode, AccountType } from '@prisma/client';
import { AccountsService } from './accounts.service';

// Constructor order: (prisma, ledger, audit, config)
const configWith = (allowLive: boolean) =>
  ({ get: jest.fn().mockReturnValue(allowLive) }) as any;

describe('AccountsService.create — simulation rail', () => {
  it('blocks LIVE account creation when ALLOW_LIVE_MODE is off', async () => {
    const svc = new AccountsService({} as any, {} as any, {} as any, configWith(false));
    await expect(
      svc.create('u1', AccountType.STANDARD, AccountMode.LIVE),
    ).rejects.toThrow('Live accounts are not available');
  });

  it('does not block DEMO account creation', async () => {
    // DEMO passes the rail; it then proceeds to real work (mocked minimally),
    // so we only assert it gets past the LIVE guard (no "not available" throw).
    const svc = new AccountsService({} as any, {} as any, {} as any, configWith(false));
    await expect(
      svc.create('u1', AccountType.STANDARD, AccountMode.DEMO),
    ).rejects.not.toThrow('Live accounts are not available');
  });
});
