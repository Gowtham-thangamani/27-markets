import { Prisma, JournalKind, JournalStatus, PostingDirection } from '@prisma/client';
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

describe('LedgerService.post — balance guard (C3)', () => {
  const money = (n: number) => new Prisma.Decimal(n);
  const input = (min: number) => ({
    kind: JournalKind.WITHDRAWAL,
    reference: 'R1',
    idempotencyKey: 'k1',
    simulated: true,
    requireBalance: { ledgerAccountId: 'cl', min: money(min) },
    postings: [
      { ledgerAccountId: 'cl', direction: PostingDirection.DEBIT, amount: money(150) },
      { ledgerAccountId: 'pay', direction: PostingDirection.CREDIT, amount: money(150) },
    ],
  });
  // tx where the client LIABILITY account has `creditSum` credited (balance).
  const txWith = (creditSum: number) => ({
    journalEntry: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'e1', postings: [] }),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    ledgerAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'cl', type: 'LIABILITY' }) },
    posting: { groupBy: jest.fn().mockResolvedValue([{ direction: 'CREDIT', _sum: { amount: creditSum } }]) },
  });

  it('locks the row and rejects when the balance is below the minimum', async () => {
    const tx = txWith(100);
    const prisma = { $transaction: (cb: (t: any) => unknown) => cb(tx) } as any;
    await expect(new LedgerService(prisma).post(input(150) as any)).rejects.toThrow(
      'Insufficient balance',
    );
    expect(tx.$queryRaw).toHaveBeenCalled(); // SELECT … FOR UPDATE
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it('posts when the guarded balance is sufficient', async () => {
    const tx = txWith(200);
    const prisma = { $transaction: (cb: (t: any) => unknown) => cb(tx) } as any;
    await new LedgerService(prisma).post(input(150) as any);
    expect(tx.journalEntry.create).toHaveBeenCalled();
  });
});
