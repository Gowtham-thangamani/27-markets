import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JournalKind,
  JournalStatus,
  LedgerAccountType,
  Prisma,
  PostingDirection,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Money, ZERO, isPositive } from './money';

export interface PostingInput {
  ledgerAccountId: string;
  direction: PostingDirection;
  amount: Money;
  currency?: string;
}

export interface PostTransactionInput {
  kind: JournalKind;
  reference: string;
  idempotencyKey: string;
  memo?: string;
  simulated: boolean;
  createdById?: string;
  /** Defaults to POSTED. Use PENDING for entries that await staff approval. */
  status?: JournalStatus;
  postings: PostingInput[];
  /**
   * Optional balance guard. Within post()'s transaction, the given ledger
   * account row is locked (SELECT … FOR UPDATE) and its balance must be ≥ `min`
   * before the entry is written. This serializes concurrent debits on that
   * account, preventing the balance TOCTOU race (double-spend).
   */
  requireBalance?: { ledgerAccountId: string; min: Money };
}

// Credit-normal account types: balance = credits - debits.
const CREDIT_NORMAL = new Set<LedgerAccountType>([
  LedgerAccountType.LIABILITY,
  LedgerAccountType.EQUITY,
  LedgerAccountType.REVENUE,
]);

/**
 * Double-entry ledger. The ONLY way money changes. Every transaction is an
 * atomic, balanced journal entry written inside a DB transaction. Balances are
 * derived from postings, never stored — so they are always provable.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Post a balanced journal entry. Idempotent on idempotencyKey. */
  async post(input: PostTransactionInput) {
    if (input.postings.length < 2) {
      throw new BadRequestException('A journal entry needs at least two postings');
    }

    // Invariant: debits must equal credits.
    let debit = ZERO;
    let credit = ZERO;
    for (const p of input.postings) {
      if (!isPositive(p.amount)) {
        throw new BadRequestException('Posting amounts must be positive; use direction for sign');
      }
      if (p.direction === PostingDirection.DEBIT) debit = debit.plus(p.amount);
      else credit = credit.plus(p.amount);
    }
    if (!debit.equals(credit)) {
      throw new BadRequestException(
        `Unbalanced entry: debits ${debit.toString()} != credits ${credit.toString()}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Idempotency: return the existing entry on retry instead of double-posting.
      const existing = await tx.journalEntry.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { postings: true },
      });
      if (existing) return existing;

      // Balance guard: lock the source account row so concurrent debits serialize
      // on it, then check the balance inside the same transaction. Without the
      // lock two withdrawals could both read the old balance and double-spend.
      if (input.requireBalance) {
        const { ledgerAccountId, min } = input.requireBalance;
        await tx.$queryRaw`SELECT id FROM "LedgerAccount" WHERE id = ${ledgerAccountId} FOR UPDATE`;
        const balance = await this.computeBalance(tx, ledgerAccountId);
        if (balance.lessThan(min)) {
          throw new BadRequestException('Insufficient balance');
        }
      }

      return tx.journalEntry.create({
        data: {
          reference: input.reference,
          kind: input.kind,
          status: input.status ?? JournalStatus.POSTED,
          idempotencyKey: input.idempotencyKey,
          memo: input.memo,
          simulated: input.simulated,
          createdById: input.createdById,
          postings: {
            create: input.postings.map((p) => ({
              ledgerAccountId: p.ledgerAccountId,
              direction: p.direction,
              amount: p.amount,
              currency: p.currency ?? 'USD',
            })),
          },
        },
        include: { postings: true },
      });
    });
  }

  /** Derived balance of a ledger account from its postings. */
  async balanceOf(ledgerAccountId: string): Promise<Money> {
    return this.computeBalance(this.prisma, ledgerAccountId);
  }

  /** Balance computation usable with either the base client or a tx client. */
  private async computeBalance(
    client: Prisma.TransactionClient,
    ledgerAccountId: string,
  ): Promise<Money> {
    const account = await client.ledgerAccount.findUnique({ where: { id: ledgerAccountId } });
    if (!account) throw new NotFoundException('Ledger account not found');

    const grouped = await client.posting.groupBy({
      by: ['direction'],
      where: { ledgerAccountId },
      _sum: { amount: true },
    });

    let debit = ZERO;
    let credit = ZERO;
    for (const g of grouped) {
      const sum = g._sum.amount ?? ZERO;
      if (g.direction === PostingDirection.DEBIT) debit = new Money(sum);
      else credit = new Money(sum);
    }

    return CREDIT_NORMAL.has(account.type) ? credit.minus(debit) : debit.minus(credit);
  }

  /** Confirm a PENDING entry (e.g. an approved withdrawal). Idempotent. */
  async markPosted(entryId: string) {
    const entry = await this.prisma.journalEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.status === JournalStatus.POSTED) return entry;
    if (entry.status !== JournalStatus.PENDING) {
      throw new BadRequestException(`Cannot post a ${entry.status} entry`);
    }
    return this.prisma.journalEntry.update({
      where: { id: entryId },
      data: { status: JournalStatus.POSTED },
    });
  }

  /**
   * Reverse an entry by posting a balanced compensating entry (flipped
   * directions) and marking the original REVERSED — restoring balances. Used to
   * reject a held withdrawal. Idempotent on a REVERSED original.
   */
  async reverse(
    entryId: string,
    opts: { reference: string; idempotencyKey: string; reversedById?: string; memo?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.journalEntry.findUnique({
        where: { id: entryId },
        include: { postings: true },
      });
      if (!original) throw new NotFoundException('Journal entry not found');
      if (original.status === JournalStatus.REVERSED) return original;

      await tx.journalEntry.create({
        data: {
          reference: opts.reference,
          kind: original.kind,
          status: JournalStatus.POSTED,
          idempotencyKey: opts.idempotencyKey,
          simulated: original.simulated,
          memo: opts.memo ?? `Reversal of ${original.reference}`,
          createdById: opts.reversedById,
          postings: {
            create: original.postings.map((p) => ({
              ledgerAccountId: p.ledgerAccountId,
              direction:
                p.direction === PostingDirection.DEBIT
                  ? PostingDirection.CREDIT
                  : PostingDirection.DEBIT,
              amount: p.amount,
              currency: p.currency,
            })),
          },
        },
      });

      return tx.journalEntry.update({
        where: { id: entryId },
        data: { status: JournalStatus.REVERSED },
      });
    });
  }

  /** Create a ledger account (idempotent on `code`). */
  async ensureAccount(params: {
    code: string;
    name: string;
    type: LedgerAccountType;
    currency?: string;
    userId?: string;
    tradingAccountId?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const client = params.tx ?? this.prisma;
    return client.ledgerAccount.upsert({
      where: { code: params.code },
      update: {},
      create: {
        code: params.code,
        name: params.name,
        type: params.type,
        currency: params.currency ?? 'USD',
        userId: params.userId,
        tradingAccountId: params.tradingAccountId,
      },
    });
  }

  /** System (firm-side) accounts that postings settle against. */
  async getSystemAccount(code: SystemAccountCode) {
    const meta = SYSTEM_ACCOUNTS[code];
    return this.ensureAccount({ code, name: meta.name, type: meta.type });
  }
}

export type SystemAccountCode = keyof typeof SYSTEM_ACCOUNTS;

export const SYSTEM_ACCOUNTS = {
  'SYSTEM:PSP_CLEARING': { name: 'PSP / Bank Clearing', type: LedgerAccountType.ASSET },
  'SYSTEM:WITHDRAWALS_PAYABLE': { name: 'Withdrawals Payable', type: LedgerAccountType.LIABILITY },
  'SYSTEM:DEMO_FUNDING': { name: 'Demo Funding (virtual)', type: LedgerAccountType.EQUITY },
  'SYSTEM:ADJUSTMENTS': { name: 'Manual Adjustments', type: LedgerAccountType.EQUITY },
} as const;
