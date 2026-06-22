import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JournalKind,
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
  postings: PostingInput[];
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

      return tx.journalEntry.create({
        data: {
          reference: input.reference,
          kind: input.kind,
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
    const account = await this.prisma.ledgerAccount.findUnique({ where: { id: ledgerAccountId } });
    if (!account) throw new NotFoundException('Ledger account not found');

    const grouped = await this.prisma.posting.groupBy({
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
} as const;
