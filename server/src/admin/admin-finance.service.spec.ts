import { JournalStatus } from '@prisma/client';
import { AdminFinanceService } from './admin-finance.service';

// Constructor order: (prisma, ledger, audit)

describe('AdminFinanceService.approveWithdrawal', () => {
  it('marks a PENDING withdrawal POSTED and audits it', async () => {
    const markPosted = jest.fn().mockResolvedValue({});
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue({ id: 'j1', kind: 'WITHDRAWAL', status: JournalStatus.PENDING }) },
    } as any;
    const ledger = { markPosted } as any;
    const service = new AdminFinanceService(prisma, ledger, { record } as any);

    const result = await service.approveWithdrawal('admin1', 'j1');

    expect(markPosted).toHaveBeenCalledWith('j1');
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'finance.withdrawal.approve', entityId: 'j1' }));
    expect(result).toEqual({ ok: true, status: JournalStatus.POSTED });
  });

  it('refuses to approve a non-pending withdrawal', async () => {
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue({ id: 'j1', kind: 'WITHDRAWAL', status: JournalStatus.POSTED }) },
    } as any;
    const service = new AdminFinanceService(prisma, {} as any, {} as any);

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
    const service = new AdminFinanceService(prisma, { reverse } as any, { record } as any);

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
    const service = new AdminFinanceService(prisma, ledger, { record } as any);

    await service.adjust('admin1', { tradingAccountId: 'acc1', amount: '50', direction: 'CREDIT', memo: 'goodwill' });

    const postings = post.mock.calls[0][0].postings;
    expect(postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([
      ['adj', 'DEBIT'],
      ['client-ledger', 'CREDIT'],
    ]);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'finance.adjustment' }));
  });
});
