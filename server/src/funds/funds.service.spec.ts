import { Prisma, JournalStatus, KycStepStatus } from '@prisma/client';
import { FundsService } from './funds.service';

// Constructor order: (prisma, ledger, accounts, audit, paymentProvider)
function makeService(overrides: { post?: jest.Mock } = {}) {
  const post = overrides.post ?? jest.fn().mockResolvedValue({ id: 'j1', reference: 'TX-1', status: JournalStatus.PENDING });
  const prisma = {
    kycProfile: {
      findUnique: jest.fn().mockResolvedValue({
        identityStatus: KycStepStatus.APPROVED,
        addressStatus: KycStepStatus.APPROVED,
        selfieStatus: KycStepStatus.APPROVED,
      }),
    },
    withdrawalDetail: { create: jest.fn().mockResolvedValue({}) },
  } as any;
  const ledger = {
    balanceOf: jest.fn().mockResolvedValue(new Prisma.Decimal(1000)),
    getSystemAccount: jest.fn().mockResolvedValue({ id: 'payable' }),
    post,
  } as any;
  const accounts = { ledgerAccountIdFor: jest.fn().mockResolvedValue('client-ledger') } as any;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
  const payments = { name: 'simulation', simulated: true, assertAvailable: jest.fn() } as any;
  const config = { get: jest.fn().mockReturnValue('http://localhost:5173') } as any;
  // No withdrawal limits configured by default (0 = off) and no prior-24h volume.
  prisma.appSetting = { findUnique: jest.fn().mockResolvedValue({ value: '0' }) };
  prisma.posting = { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) };
  return { service: new FundsService(prisma, ledger, accounts, audit, payments, config, { assertNotBlocked: jest.fn() } as any, { create: jest.fn() } as any), post, audit, payments, prisma };
}

describe('FundsService.depositMethods', () => {
  const svc = (gateways: { type: string; enabled: boolean }[]) => {
    const prisma = { paymentGateway: { findMany: jest.fn().mockResolvedValue(gateways) } } as any;
    const payments = { name: 'simulation' } as any;
    const config = { get: jest.fn().mockReturnValue('') } as any; // no bank/crypto config
    return new FundsService(prisma, {} as any, {} as any, {} as any, payments, config, { assertNotBlocked: jest.fn() } as any, { create: jest.fn() } as any);
  };

  it('marks a rail unavailable when its gateway is disabled', async () => {
    const methods = await svc([{ type: 'BANK', enabled: false }]).depositMethods();
    expect(methods.find((m) => m.id === 'bank')?.status).toBe('unavailable');
  });

  it('offers e-wallets when an enabled EWALLET gateway exists', async () => {
    const methods = await svc([{ type: 'EWALLET', enabled: true }]).depositMethods();
    expect(methods.find((m) => m.id === 'ewallet')?.status).toBe('manual');
  });
});

describe('FundsService.withdraw', () => {
  it('creates the withdrawal entry as PENDING (held, awaiting approval)', async () => {
    const { service, post } = makeService();

    const result = await service.withdraw('user1', { accountId: 'acc1', amount: '100', method: 'bank', accountName: 'Jordan Avery', accountNumber: 'AE07 0331 1111 2222' } as any);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0].status).toBe(JournalStatus.PENDING);
    expect(post.mock.calls[0][0].kind).toBe('WITHDRAWAL');
    expect(result.status).toBe(JournalStatus.PENDING);
  });

  it('delegates the balance check to the atomic ledger post (guardBalance), not a racy pre-check', async () => {
    const { service, post } = makeService();

    await service.withdraw('user1', { accountId: 'acc1', amount: '100', method: 'bank', accountName: 'Jordan Avery', accountNumber: 'AE07 0331 1111 2222' } as any);

    const arg = post.mock.calls[0][0];
    expect(arg.guardBalance).toEqual(expect.objectContaining({ ledgerAccountId: 'client-ledger' }));
    expect(Number(arg.guardBalance.atLeast)).toBe(100);
  });

  it('rejects a withdrawal above the per-transaction ceiling', async () => {
    const { service, prisma } = makeService();
    prisma.appSetting.findUnique = jest.fn(({ where: { key } }: any) =>
      Promise.resolve({ value: key === 'withdrawal_max_single_usd' ? '50000' : '0' }),
    );
    await expect(
      service.withdraw('user1', { accountId: 'acc1', amount: '60000', method: 'bank', accountName: 'J A', accountNumber: 'AE07' } as any),
    ).rejects.toThrow(/maximum single withdrawal/i);
  });

  it('rejects when the rolling-24h total would exceed the daily limit', async () => {
    const { service, prisma } = makeService();
    prisma.appSetting.findUnique = jest.fn(({ where: { key } }: any) =>
      Promise.resolve({ value: key === 'withdrawal_daily_limit_usd' ? '100000' : '0' }),
    );
    prisma.posting.aggregate = jest.fn().mockResolvedValue({ _sum: { amount: 95000 } }); // already out
    await expect(
      service.withdraw('user1', { accountId: 'acc1', amount: '10000', method: 'bank', accountName: 'J A', accountNumber: 'AE07' } as any),
    ).rejects.toThrow(/24-hour withdrawal limit/i);
  });

  it('allows a withdrawal within both limits', async () => {
    const { service, post, prisma } = makeService();
    prisma.appSetting.findUnique = jest.fn(({ where: { key } }: any) =>
      Promise.resolve({ value: key === 'withdrawal_max_single_usd' ? '50000' : '100000' }),
    );
    prisma.posting.aggregate = jest.fn().mockResolvedValue({ _sum: { amount: 5000 } });
    await service.withdraw('user1', { accountId: 'acc1', amount: '1000', method: 'bank', accountName: 'J A', accountNumber: 'AE07' } as any);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('treats a 0 / unset limit as no limit', async () => {
    const { service, post } = makeService(); // defaults: appSetting value '0'
    await service.withdraw('user1', { accountId: 'acc1', amount: '999999', method: 'bank', accountName: 'J A', accountNumber: 'AE07' } as any);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('reflects the real provider mode in the response + audit (not hardcoded simulated)', async () => {
    // With a live (non-simulation) provider a real withdrawal must NOT be labelled simulated.
    const { service, post, audit } = makeService();
    (service as any).payments = { name: 'stripe', simulated: false, assertAvailable: jest.fn() };
    void post;

    const result = await service.withdraw('user1', { accountId: 'acc1', amount: '100', method: 'bank', accountName: 'Jordan Avery', accountNumber: 'AE07 0331 1111 2222' } as any);

    expect(result.simulated).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'funds.withdraw', metadata: expect.objectContaining({ simulated: false }) }),
    );
  });
});

describe('FundsService.deposit — live gating (H-2)', () => {
  const build = (simulated: boolean, minDeposit = '50') => {
    const post = jest.fn().mockResolvedValue({ id: 'j1', reference: 'TX-1', status: JournalStatus.POSTED });
    const prisma = { appSetting: { findUnique: jest.fn().mockResolvedValue({ value: minDeposit }) } } as any;
    const ledger = { getSystemAccount: jest.fn().mockResolvedValue({ id: 'clearing' }), post } as any;
    const accounts = { ledgerAccountIdFor: jest.fn().mockResolvedValue('client-ledger') } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const payments = { name: simulated ? 'simulation' : 'stripe', simulated, assertAvailable: jest.fn() } as any;
    const config = { get: jest.fn() } as any;
    return { service: new FundsService(prisma, ledger, accounts, audit, payments, config, { assertNotBlocked: jest.fn() } as any, { create: jest.fn() } as any), post };
  };

  it('refuses a direct inline deposit when the provider is not simulated (live)', async () => {
    const { service, post } = build(false);
    await expect(
      service.deposit('u1', { accountId: 'acc1', amount: '100', method: 'Card' } as any),
    ).rejects.toThrow(/simulation/i);
    expect(post).not.toHaveBeenCalled(); // no ledger credit
  });

  it('credits inline in simulation', async () => {
    const { service, post } = build(true);
    await service.deposit('u1', { accountId: 'acc1', amount: '100', method: 'Card' } as any);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('rejects a deposit below the configured minimum ($50)', async () => {
    const { service, post } = build(true);
    await expect(
      service.deposit('u1', { accountId: 'acc1', amount: '10', method: 'Card' } as any),
    ).rejects.toThrow(/minimum deposit/i);
    expect(post).not.toHaveBeenCalled();
  });
});

describe('FundsService.transfer', () => {
  it('guards the source-account balance atomically in the ledger post', async () => {
    const { service, post } = makeService();

    await service.transfer('user1', { fromAccountId: 'acc1', toAccountId: 'acc2', amount: '250' } as any);

    const arg = post.mock.calls[0][0];
    expect(arg.guardBalance).toEqual(expect.objectContaining({ ledgerAccountId: 'client-ledger' }));
    expect(Number(arg.guardBalance.atLeast)).toBe(250);
  });
});
