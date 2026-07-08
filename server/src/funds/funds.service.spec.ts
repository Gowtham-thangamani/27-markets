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
  return { service: new FundsService(prisma, ledger, accounts, audit, payments, config), post, audit, payments };
}

describe('FundsService.depositMethods', () => {
  const svc = (gateways: { type: string; enabled: boolean }[]) => {
    const prisma = { paymentGateway: { findMany: jest.fn().mockResolvedValue(gateways) } } as any;
    const payments = { name: 'simulation' } as any;
    const config = { get: jest.fn().mockReturnValue('') } as any; // no bank/crypto config
    return new FundsService(prisma, {} as any, {} as any, {} as any, payments, config);
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
});
