import { Prisma, JournalStatus, KycStepStatus } from '@prisma/client';
import { FundsService } from './funds.service';

// Constructor order: (prisma, ledger, accounts, audit, config)
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
  } as any;
  const ledger = {
    balanceOf: jest.fn().mockResolvedValue(new Prisma.Decimal(1000)),
    getSystemAccount: jest.fn().mockResolvedValue({ id: 'payable' }),
    post,
  } as any;
  const accounts = { ledgerAccountIdFor: jest.fn().mockResolvedValue('client-ledger') } as any;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
  const config = { get: jest.fn().mockReturnValue('SIMULATION') } as any;
  return { service: new FundsService(prisma, ledger, accounts, audit, config), post, audit };
}

describe('FundsService.withdraw', () => {
  it('creates the withdrawal entry as PENDING (held, awaiting approval)', async () => {
    const { service, post } = makeService();

    const result = await service.withdraw('user1', { accountId: 'acc1', amount: '100', method: 'bank' } as any);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0].status).toBe(JournalStatus.PENDING);
    expect(post.mock.calls[0][0].kind).toBe('WITHDRAWAL');
    expect(result.status).toBe(JournalStatus.PENDING);
  });
});
