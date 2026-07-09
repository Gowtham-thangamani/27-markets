import { Prisma, JournalStatus, PostingDirection } from '@prisma/client';
import { LedgerService } from './ledger.service';

describe('LedgerService.markPosted', () => {
  it('confirms a PENDING entry to POSTED', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'j1', status: 'POSTED' });
    const prisma = {
      journalEntry: {
        findUnique: jest.fn().mockResolvedValue({ id: 'j1', status: JournalStatus.PENDING }),
        update,
      },
    } as any;
    const ledger = new LedgerService(prisma);

    await ledger.markPosted('j1');

    expect(update).toHaveBeenCalledWith({ where: { id: 'j1' }, data: { status: JournalStatus.POSTED } });
  });

  it('rejects posting a non-PENDING entry', async () => {
    const prisma = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue({ id: 'j1', status: JournalStatus.REVERSED }) },
    } as any;
    const ledger = new LedgerService(prisma);

    await expect(ledger.markPosted('j1')).rejects.toThrow('Cannot post a REVERSED entry');
  });
});

describe('LedgerService.post — balance guard (H-1)', () => {
  const txWith = (parts: { debit?: number; credit?: number }, accountType = 'LIABILITY') => {
    const create = jest.fn().mockResolvedValue({ id: 'j1', status: 'PENDING', postings: [] });
    const grouped: any[] = [];
    if (parts.debit != null) grouped.push({ direction: PostingDirection.DEBIT, _sum: { amount: new Prisma.Decimal(parts.debit) } });
    if (parts.credit != null) grouped.push({ direction: PostingDirection.CREDIT, _sum: { amount: new Prisma.Decimal(parts.credit) } });
    const tx = {
      journalEntry: { findUnique: jest.fn().mockResolvedValue(null), create },
      ledgerAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'client', type: accountType }) },
      posting: { groupBy: jest.fn().mockResolvedValue(grouped) },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'client' }]),
    };
    const prisma = { $transaction: (cb: (t: typeof tx) => unknown) => cb(tx) } as any;
    return { prisma, tx, create };
  };
  const input = (extra: any) => ({
    kind: 'WITHDRAWAL', reference: 'TX-1', idempotencyKey: 'w:1', simulated: true, status: JournalStatus.PENDING,
    postings: [
      { ledgerAccountId: 'client', direction: PostingDirection.DEBIT, amount: new Prisma.Decimal(100) },
      { ledgerAccountId: 'payable', direction: PostingDirection.CREDIT, amount: new Prisma.Decimal(100) },
    ],
    ...extra,
  });

  it('locks the account row and rejects when the guarded balance is insufficient', async () => {
    const { prisma, create, tx } = txWith({ credit: 50 }); // LIABILITY balance = 50
    const ledger = new LedgerService(prisma);

    await expect(
      ledger.post(input({ guardBalance: { ledgerAccountId: 'client', atLeast: new Prisma.Decimal(100), message: 'Insufficient balance for this withdrawal' } })),
    ).rejects.toThrow('Insufficient balance for this withdrawal');

    expect(tx.$queryRaw).toHaveBeenCalled(); // took a FOR UPDATE lock
    expect(create).not.toHaveBeenCalled(); // no entry created
  });

  it('posts when the guarded balance is sufficient', async () => {
    const { prisma, create } = txWith({ credit: 1000 });
    const ledger = new LedgerService(prisma);

    await ledger.post(input({ guardBalance: { ledgerAccountId: 'client', atLeast: new Prisma.Decimal(100) } }));

    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('LedgerService.reverse', () => {
  it('posts a flipped-direction compensating entry and marks the original REVERSED', async () => {
    const create = jest.fn().mockResolvedValue({});
    const update = jest.fn().mockResolvedValue({ id: 'j1', status: 'REVERSED' });
    const tx = {
      journalEntry: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'j1',
          status: JournalStatus.PENDING,
          kind: 'WITHDRAWAL',
          reference: 'TX-1',
          simulated: true,
          postings: [
            { ledgerAccountId: 'client', direction: PostingDirection.DEBIT, amount: new Prisma.Decimal(100), currency: 'USD' },
            { ledgerAccountId: 'payable', direction: PostingDirection.CREDIT, amount: new Prisma.Decimal(100), currency: 'USD' },
          ],
        }),
        create,
        update,
      },
    };
    const prisma = { $transaction: (cb: (t: typeof tx) => unknown) => cb(tx) } as any;
    const ledger = new LedgerService(prisma);

    await ledger.reverse('j1', { reference: 'TX-2', idempotencyKey: 'rev:j1', reversedById: 'admin1' });

    const created = create.mock.calls[0][0].data;
    expect(created.postings.create.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([
      ['client', PostingDirection.CREDIT],
      ['payable', PostingDirection.DEBIT],
    ]);
    expect(update).toHaveBeenCalledWith({ where: { id: 'j1' }, data: { status: JournalStatus.REVERSED } });
  });

  it('is idempotent on an already-REVERSED entry', async () => {
    const create = jest.fn();
    const tx = {
      journalEntry: {
        findUnique: jest.fn().mockResolvedValue({ id: 'j1', status: JournalStatus.REVERSED, postings: [] }),
        create,
        update: jest.fn(),
      },
    };
    const prisma = { $transaction: (cb: (t: typeof tx) => unknown) => cb(tx) } as any;
    const ledger = new LedgerService(prisma);

    await ledger.reverse('j1', { reference: 'TX-2', idempotencyKey: 'rev:j1' });

    expect(create).not.toHaveBeenCalled();
  });
});
