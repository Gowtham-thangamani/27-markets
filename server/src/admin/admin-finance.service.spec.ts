import { JournalStatus } from '@prisma/client';
import { AdminFinanceService } from './admin-finance.service';

// Constructor order: (prisma, ledger, audit, payments)
const payments = () => ({
  payout: jest.fn().mockResolvedValue({ payoutId: 'sim_TX-1', status: 'paid', simulated: true }),
  assertAvailable: jest.fn(),
  createDepositCheckout: jest.fn(),
  name: 'simulation',
  simulated: true,
});

describe('AdminFinanceService.approveWithdrawal', () => {
  it('pays out, marks the withdrawal POSTED, and audits it', async () => {
    const markPosted = jest.fn().mockResolvedValue({});
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      journalEntry: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'j1', kind: 'WITHDRAWAL', status: JournalStatus.PENDING, reference: 'TX-1',
          postings: [{ amount: 100, currency: 'USD', ledgerAccount: { userId: 'u1' } }],
        }),
      },
    } as any;
    const ledger = { markPosted } as any;
    const pay = payments();
    const service = new AdminFinanceService(prisma, ledger, { record } as any, pay as any);

    const result = await service.approveWithdrawal('admin1', 'j1');

    expect(pay.payout).toHaveBeenCalledWith(expect.objectContaining({ reference: 'TX-1', amountMinor: 10000, currency: 'USD' }));
    expect(markPosted).toHaveBeenCalledWith('j1');
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'finance.withdrawal.approve', entityId: 'j1' }));
    expect(result).toMatchObject({ ok: true, status: JournalStatus.POSTED, payout: { simulated: true } });
  });

  it('refuses to approve a non-pending withdrawal', async () => {
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue({ id: 'j1', kind: 'WITHDRAWAL', status: JournalStatus.POSTED }) },
    } as any;
    const service = new AdminFinanceService(prisma, {} as any, {} as any, payments() as any);

    await expect(service.approveWithdrawal('admin1', 'j1')).rejects.toThrow('Withdrawal is not pending');
  });
});

describe('AdminFinanceService.rejectWithdrawal', () => {
  it('reverses the held entry and audits the reason', async () => {
    const reverse = jest.fn().mockResolvedValue({});
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue({ id: 'j1', kind: 'WITHDRAWAL', status: JournalStatus.PENDING }) },
    } as any;
    const service = new AdminFinanceService(prisma, { reverse } as any, { record } as any, payments() as any);

    const result = await service.rejectWithdrawal('admin1', 'j1', 'bad details');

    expect(reverse).toHaveBeenCalledWith('j1', expect.objectContaining({ idempotencyKey: 'reject:j1', reversedById: 'admin1' }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'finance.withdrawal.reject', metadata: { reason: 'bad details' } }));
    expect(result.status).toBe(JournalStatus.REVERSED);
  });
});

describe('AdminFinanceService.adjust', () => {
  it('CREDIT posts DEBIT adjustments / CREDIT client', async () => {
    const post = jest.fn().mockResolvedValue({ id: 'a1', reference: 'TX-9' });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', ledgerAccount: { id: 'client-ledger' } }) },
    } as any;
    const ledger = { getSystemAccount: jest.fn().mockResolvedValue({ id: 'adj' }), post } as any;
    const service = new AdminFinanceService(prisma, ledger, { record } as any, payments() as any);

    await service.adjust('admin1', { tradingAccountId: 'acc1', amount: '50', direction: 'CREDIT', memo: 'goodwill' });

    const postings = post.mock.calls[0][0].postings;
    expect(postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([
      ['adj', 'DEBIT'],
      ['client-ledger', 'CREDIT'],
    ]);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'finance.adjustment' }));
  });
});
