import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { JournalKind, JournalStatus, PostingDirection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { formatMoney, toMoney } from '../ledger/money';
import { generateTxReference } from '../common/reference';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider';
import type { AdjustmentDto } from './admin-finance.dto';

@Injectable()
export class AdminFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  private async listByKindStatus(kind: JournalKind, status: JournalStatus) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { kind, status },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        postings: {
          include: {
            ledgerAccount: { include: { user: true, tradingAccount: true } },
          },
        },
      },
    });

    return entries.map((e) => {
      // The client-facing leg is the posting on a user-owned ledger account.
      const leg = e.postings.find((p) => p.ledgerAccount.userId);
      const u = leg?.ledgerAccount.user;
      return {
        id: e.id,
        reference: e.reference,
        status: e.status,
        amount: formatMoney(leg ? leg.amount : toMoney(0)),
        memo: e.memo,
        createdAt: e.createdAt,
        accountNumber: leg?.ledgerAccount.tradingAccount?.number ?? null,
        client: u ? { id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email } : null,
      };
    });
  }

  /** Withdrawals awaiting finance approval. */
  pendingWithdrawals() {
    return this.listByKindStatus(JournalKind.WITHDRAWAL, JournalStatus.PENDING);
  }

  /** Recent completed deposits. */
  deposits() {
    return this.listByKindStatus(JournalKind.DEPOSIT, JournalStatus.POSTED);
  }

  private async loadPendingWithdrawal(entryId: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: { postings: { include: { ledgerAccount: true } } },
    });
    if (!entry || entry.kind !== JournalKind.WITHDRAWAL) {
      throw new NotFoundException('Withdrawal not found');
    }
    if (entry.status !== JournalStatus.PENDING) {
      throw new BadRequestException('Withdrawal is not pending');
    }
    return entry;
  }

  async approveWithdrawal(adminId: string, entryId: string) {
    const entry = await this.loadPendingWithdrawal(entryId);

    // The client-facing leg is the DEBIT on the user-owned ledger account.
    const clientLeg = entry.postings?.find((p) => p.ledgerAccount.userId);
    const amountMinor = clientLeg ? Math.round(Number(clientLeg.amount) * 100) : 0;
    const currency = clientLeg?.currency ?? 'USD';

    // Send the payout FIRST — if it fails, the withdrawal stays pending (not posted).
    const payout = await this.payments.payout({
      reference: entry.reference,
      amountMinor,
      currency,
      metadata: { entryId },
    });

    await this.ledger.markPosted(entryId);
    await this.audit.record({
      userId: adminId,
      action: 'finance.withdrawal.approve',
      entity: 'JournalEntry',
      entityId: entryId,
      metadata: { payoutId: payout.payoutId, payoutStatus: payout.status, simulated: payout.simulated },
    });
    return { ok: true, status: JournalStatus.POSTED, payout };
  }

  async rejectWithdrawal(adminId: string, entryId: string, reason?: string) {
    await this.loadPendingWithdrawal(entryId);
    await this.ledger.reverse(entryId, {
      reference: generateTxReference(),
      idempotencyKey: `reject:${entryId}`,
      reversedById: adminId,
      memo: reason ? `Withdrawal rejected: ${reason}` : 'Withdrawal rejected',
    });
    await this.audit.record({
      userId: adminId,
      action: 'finance.withdrawal.reject',
      entity: 'JournalEntry',
      entityId: entryId,
      metadata: { reason },
    });
    return { ok: true, status: JournalStatus.REVERSED };
  }

  /** Manual balance adjustment (Admin). CREDIT increases the client balance. */
  async adjust(adminId: string, dto: AdjustmentDto) {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: dto.tradingAccountId },
      include: { ledgerAccount: true },
    });
    if (!account || !account.ledgerAccount) throw new NotFoundException('Account not found');

    const adjustments = await this.ledger.getSystemAccount('SYSTEM:ADJUSTMENTS');
    const amount = toMoney(dto.amount);
    const clientId = account.ledgerAccount.id;

    // Client ledger is credit-normal (LIABILITY): CREDIT raises balance, DEBIT lowers it.
    const postings =
      dto.direction === 'CREDIT'
        ? [
            { ledgerAccountId: adjustments.id, direction: PostingDirection.DEBIT, amount },
            { ledgerAccountId: clientId, direction: PostingDirection.CREDIT, amount },
          ]
        : [
            { ledgerAccountId: clientId, direction: PostingDirection.DEBIT, amount },
            { ledgerAccountId: adjustments.id, direction: PostingDirection.CREDIT, amount },
          ];

    const entry = await this.ledger.post({
      kind: JournalKind.ADJUSTMENT,
      reference: generateTxReference(),
      idempotencyKey: `adjust:${dto.tradingAccountId}:${randomUUID()}`,
      simulated: true,
      createdById: adminId,
      memo: `Manual adjustment (${dto.direction}): ${dto.memo}`,
      postings,
    });

    await this.audit.record({
      userId: adminId,
      action: 'finance.adjustment',
      entity: 'JournalEntry',
      entityId: entry.id,
      metadata: { tradingAccountId: dto.tradingAccountId, amount: dto.amount, direction: dto.direction },
    });
    return { reference: entry.reference, amount: formatMoney(amount), direction: dto.direction };
  }
}
