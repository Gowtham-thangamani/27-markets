import { JournalStatus } from '@prisma/client';
import { AdminFinanceService } from './admin-finance.service';

// Constructor order: (prisma, ledger, audit, payments, config)
const payments = () => ({
  payout: jest.fn().mockResolvedValue({ payoutId: 'sim_TX-1', status: 'paid', simulated: true }),
  assertAvailable: jest.fn(),
  createDepositCheckout: jest.fn(),
  name: 'simulation',
  simulated: true,
});
const cfg = () => ({ get: () => 'SIMULATION' }) as any;
const notify = () => ({ create: jest.fn() }) as any;

describe('AdminFinanceService.approveWithdrawal', () => {
  const pendingEntry = () => ({
    id: 'j1', kind: 'WITHDRAWAL', status: JournalStatus.PENDING, reference: 'TX-1',
    postings: [{ amount: 100, currency: 'USD', ledgerAccount: { userId: 'u1' } }],
  });

  it('claims PENDING→POSTED, pays out, and audits it', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue(pendingEntry()), updateMany },
      appSetting: { findUnique: jest.fn().mockResolvedValue({ value: '0' }) }, // dual-control off
    } as any;
    const pay = payments();
    const service = new AdminFinanceService(prisma, {} as any, { record } as any, pay as any, cfg(), notify());

    const result = await service.approveWithdrawal('admin1', 'j1');

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'j1', status: JournalStatus.PENDING }), data: expect.objectContaining({ status: JournalStatus.POSTED }) }),
    );
    expect(pay.payout).toHaveBeenCalledWith(expect.objectContaining({ reference: 'TX-1', amountMinor: 10000, currency: 'USD' }));
    expect(result).toMatchObject({ ok: true, status: JournalStatus.POSTED, payout: { simulated: true } });
  });

  it('does not pay out when a concurrent approval already claimed the withdrawal', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 }); // lost the claim
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue(pendingEntry()), updateMany },
      appSetting: { findUnique: jest.fn().mockResolvedValue({ value: '0' }) }, // dual-control off
    } as any;
    const pay = payments();
    const service = new AdminFinanceService(prisma, {} as any, { record: jest.fn() } as any, pay as any, cfg(), notify());

    await expect(service.approveWithdrawal('admin1', 'j1')).rejects.toThrow(/already processed/i);
    expect(pay.payout).not.toHaveBeenCalled();
  });

  it('rolls the claim back to PENDING if the payout fails', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue(pendingEntry()), updateMany },
      appSetting: { findUnique: jest.fn().mockResolvedValue({ value: '0' }) }, // dual-control off
    } as any;
    const pay = payments();
    pay.payout = jest.fn().mockRejectedValue(new Error('payout failed'));
    const service = new AdminFinanceService(prisma, {} as any, { record: jest.fn() } as any, pay as any, cfg(), notify());

    await expect(service.approveWithdrawal('admin1', 'j1')).rejects.toThrow('payout failed');
    // second updateMany reverts POSTED → PENDING
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'j1', status: JournalStatus.POSTED }), data: expect.objectContaining({ status: JournalStatus.PENDING }) }),
    );
  });

  const dualControl = (opts: { firstApproverId?: string | null }) => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const detailUpdate = jest.fn().mockResolvedValue({});
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue({ ...pendingEntry(), postings: [{ amount: 20000, currency: 'USD', ledgerAccount: { userId: 'u1' } }] }), updateMany },
      appSetting: { findUnique: jest.fn().mockResolvedValue({ value: '10000' }) }, // threshold $10k
      withdrawalDetail: { findUnique: jest.fn().mockResolvedValue({ firstApproverId: opts.firstApproverId ?? null }), update: detailUpdate },
    } as any;
    const pay = payments();
    const service = new AdminFinanceService(prisma, {} as any, { record: jest.fn() } as any, pay as any, cfg(), notify());
    return { service, pay, detailUpdate, updateMany };
  };

  it('above the dual-control threshold, the first approval only records the approver (no payout)', async () => {
    const { service, pay, detailUpdate } = dualControl({ firstApproverId: null });
    const res = await service.approveWithdrawal('adminA', 'j1');
    expect(res).toMatchObject({ ok: true, status: 'AWAITING_SECOND_APPROVAL' });
    expect(detailUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ firstApproverId: 'adminA' }) }));
    expect(pay.payout).not.toHaveBeenCalled();
  });

  it('rejects a second approval from the same admin', async () => {
    const { service, pay } = dualControl({ firstApproverId: 'adminA' });
    await expect(service.approveWithdrawal('adminA', 'j1')).rejects.toThrow(/different admin/i);
    expect(pay.payout).not.toHaveBeenCalled();
  });

  it('pays out on a second approval from a different admin', async () => {
    const { service, pay } = dualControl({ firstApproverId: 'adminA' });
    const res = await service.approveWithdrawal('adminB', 'j1');
    expect(pay.payout).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ status: JournalStatus.POSTED });
  });

  it('notifies the client when a withdrawal is approved', async () => {
    const notifications = { create: jest.fn() };
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue(pendingEntry()), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      appSetting: { findUnique: jest.fn().mockResolvedValue({ value: '0' }) },
    } as any;
    const service = new AdminFinanceService(prisma, {} as any, { record: jest.fn() } as any, payments() as any, cfg(), notifications as any);
    await service.approveWithdrawal('admin1', 'j1');
    expect(notifications.create).toHaveBeenCalledWith('u1', expect.objectContaining({ title: 'Withdrawal approved' }));
  });

  it('refuses to approve a non-pending withdrawal', async () => {
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue({ id: 'j1', kind: 'WITHDRAWAL', status: JournalStatus.POSTED }) },
    } as any;
    const service = new AdminFinanceService(prisma, {} as any, {} as any, payments() as any, cfg(), notify());

    await expect(service.approveWithdrawal('admin1', 'j1')).rejects.toThrow('Withdrawal is not pending');
  });
});

describe('AdminFinanceService.allWithdrawals', () => {
  const userLeg = (direction: string, amount = 100) => ({
    amount,
    direction,
    ledgerAccount: { userId: 'u1', user: { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com' }, tradingAccount: { number: '10012345' } },
  });
  const systemLeg = (direction: string, amount = 100) => ({
    amount,
    direction,
    ledgerAccount: { userId: null, user: null, tradingAccount: null },
  });

  it('lists real withdrawals and drops reversal compensation entries', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'w-paid', reference: 'TX-1', status: JournalStatus.POSTED, memo: 'Withdrawal via bank', createdAt: new Date('2026-06-20'), postings: [userLeg('DEBIT'), systemLeg('CREDIT')] },
      { id: 'w-rejected', reference: 'TX-2', status: JournalStatus.REVERSED, memo: 'Withdrawal via bank', createdAt: new Date('2026-06-21'), postings: [userLeg('DEBIT'), systemLeg('CREDIT')] },
      // Reversal compensation entry — same WITHDRAWAL kind, client leg flipped to CREDIT. Must be excluded.
      { id: 'w-reversal', reference: 'TX-3', status: JournalStatus.POSTED, memo: 'Withdrawal rejected', createdAt: new Date('2026-06-21'), postings: [userLeg('CREDIT'), systemLeg('DEBIT')] },
    ]);
    const prisma = {
      journalEntry: { findMany },
      withdrawalDetail: { findMany: jest.fn().mockResolvedValue([{ journalEntryId: 'w-paid', method: 'bank', accountName: 'Ada L' }]) },
    } as any;
    const service = new AdminFinanceService(prisma, {} as any, {} as any, payments() as any, cfg(), notify());

    const rows = await service.allWithdrawals();

    expect(rows.map((r) => r.id)).toEqual(['w-paid', 'w-rejected']);
    expect(rows[0]).toMatchObject({ status: JournalStatus.POSTED, accountNumber: '10012345', client: { name: 'Ada Lovelace' } });
    expect(rows[0].destination).toMatchObject({ method: 'bank' });
    expect(rows[1].destination).toBeNull();
  });

  it('passes a status filter through to the query', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { journalEntry: { findMany }, withdrawalDetail: { findMany: jest.fn().mockResolvedValue([]) } } as any;
    const service = new AdminFinanceService(prisma, {} as any, {} as any, payments() as any, cfg(), notify());

    await service.allWithdrawals(JournalStatus.PENDING);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: JournalStatus.PENDING }) }));
  });
});

describe('AdminFinanceService.listWallets', () => {
  it('lists client ledger accounts with their live balance + owner', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'la1', code: 'CLIENT:a1', currency: 'USD',
        user: { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com' },
        tradingAccount: { number: '10012345', type: 'STANDARD', mode: 'LIVE', status: 'ACTIVE' },
      },
    ]);
    const prisma = { ledgerAccount: { findMany } } as any;
    const ledger = { balanceOf: jest.fn().mockResolvedValue(1000) } as any;
    const service = new AdminFinanceService(prisma, ledger, {} as any, payments() as any, cfg(), notify());

    const rows = await service.listWallets();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: { not: null } } }));
    expect(rows[0]).toMatchObject({ id: 'la1', accountNumber: '10012345', owner: { name: 'Ada Lovelace' } });
    expect(rows[0].balance).toBeDefined();
  });
});

describe('AdminFinanceService.allDepositRequests', () => {
  it('maps requests with client + status and applies a status filter', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'd1', reference: 'DR-1', method: 'bank', asset: null, amount: '200.00',
        status: 'APPROVED', createdAt: new Date('2026-06-20'), reviewedAt: new Date('2026-06-21'),
        user: { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com' },
      },
    ]);
    const prisma = { depositRequest: { findMany } } as any;
    const service = new AdminFinanceService(prisma, {} as any, {} as any, payments() as any, cfg(), notify());

    const rows = await service.allDepositRequests('APPROVED' as any);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'APPROVED' } }));
    expect(rows[0]).toMatchObject({ id: 'd1', status: 'APPROVED', method: 'bank', client: { name: 'Ada Lovelace' } });
  });

  it('omits the where filter when no status is given', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { depositRequest: { findMany } } as any;
    const service = new AdminFinanceService(prisma, {} as any, {} as any, payments() as any, cfg(), notify());

    await service.allDepositRequests();

    expect(findMany.mock.calls[0][0].where).toBeUndefined();
  });
});

describe('AdminFinanceService.rejectWithdrawal', () => {
  it('reverses the held entry and audits the reason', async () => {
    const reverse = jest.fn().mockResolvedValue({});
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue({ id: 'j1', kind: 'WITHDRAWAL', status: JournalStatus.PENDING }) },
    } as any;
    const service = new AdminFinanceService(prisma, { reverse } as any, { record } as any, payments() as any, cfg(), notify());

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
    const service = new AdminFinanceService(prisma, ledger, { record } as any, payments() as any, cfg(), notify());

    await service.adjust('admin1', { tradingAccountId: 'acc1', amount: '50', direction: 'CREDIT', memo: 'goodwill' });

    const postings = post.mock.calls[0][0].postings;
    expect(postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([
      ['adj', 'DEBIT'],
      ['client-ledger', 'CREDIT'],
    ]);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'finance.adjustment' }));
  });
});

describe('AdminFinanceService deposit requests', () => {
  it('approveDepositRequest posts a DEPOSIT and marks the request APPROVED', async () => {
    const post = jest.fn().mockResolvedValue({ id: 'e1', reference: 'TX-7' });
    const update = jest.fn().mockResolvedValue({});
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      depositRequest: {
        findUnique: jest.fn().mockResolvedValue({ id: 'd1', userId: 'u1', accountId: 'acc1', method: 'bank', asset: null, amount: '200.00', status: 'PENDING' }),
        update,
      },
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', ledgerAccount: { id: 'client-ledger' } }) },
    } as any;
    const ledger = { getSystemAccount: jest.fn().mockResolvedValue({ id: 'clearing' }), post } as any;
    const service = new AdminFinanceService(prisma, ledger, { record } as any, payments() as any, cfg(), notify());

    const res = await service.approveDepositRequest('admin1', 'd1');

    const postings = post.mock.calls[0][0].postings;
    expect(postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([
      ['clearing', 'DEBIT'],
      ['client-ledger', 'CREDIT'],
    ]);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'd1' }, data: expect.objectContaining({ status: 'APPROVED', journalEntryId: 'e1' }) }));
    expect(res).toMatchObject({ ok: true, status: 'APPROVED' });
  });

  it('rejectDepositRequest marks the request REJECTED', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = { depositRequest: { findUnique: jest.fn().mockResolvedValue({ id: 'd1', status: 'PENDING' }), update } } as any;
    const service = new AdminFinanceService(prisma, {} as any, { record: jest.fn() } as any, payments() as any, cfg(), notify());

    const res = await service.rejectDepositRequest('admin1', 'd1', 'no proof');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED' }) }));
    expect(res.status).toBe('REJECTED');
  });
});
