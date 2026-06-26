import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JournalKind, JournalStatus, PostingDirection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { formatMoney, toMoney } from '../ledger/money';
import { generateTxReference } from '../common/reference';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider';
import type { Env } from '../config/env.validation';
import type { AdjustmentDto } from './admin-finance.dto';

@Injectable()
export class AdminFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ── Deposit requests (manual bank/crypto rails) ──

  /** Deposit requests awaiting finance confirmation of received funds. */
  async pendingDepositRequests() {
    const reqs = await this.prisma.depositRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: true },
    });
    return reqs.map((r) => ({
      id: r.id,
      reference: r.reference,
      method: r.method,
      asset: r.asset,
      amount: formatMoney(toMoney(r.amount.toString())),
      createdAt: r.createdAt,
      client: r.user ? { id: r.user.id, name: `${r.user.firstName} ${r.user.lastName}`, email: r.user.email } : null,
    }));
  }

  /** Confirm receipt → post the real deposit to the client ledger. */
  async approveDepositRequest(adminId: string, requestId: string) {
    const req = await this.prisma.depositRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Deposit request not found');
    if (req.status !== 'PENDING') throw new BadRequestException('Deposit request is not pending');

    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: req.accountId },
      include: { ledgerAccount: true },
    });
    if (!account?.ledgerAccount) throw new NotFoundException('Target account not found');

    const clearing = await this.ledger.getSystemAccount('SYSTEM:PSP_CLEARING');
    const amount = toMoney(req.amount.toString());
    const simulated = this.config.get('TRADING_MODE', { infer: true }) !== 'LIVE';

    const entry = await this.ledger.post({
      kind: JournalKind.DEPOSIT,
      reference: generateTxReference(),
      idempotencyKey: `deposit-req:${req.id}`,
      simulated,
      createdById: req.userId,
      memo: `Deposit via ${req.method}${req.asset ? ` (${req.asset})` : ''} — confirmed`,
      postings: [
        { ledgerAccountId: clearing.id, direction: PostingDirection.DEBIT, amount },
        { ledgerAccountId: account.ledgerAccount.id, direction: PostingDirection.CREDIT, amount },
      ],
    });

    await this.prisma.depositRequest.update({
      where: { id: req.id },
      data: { status: 'APPROVED', journalEntryId: entry.id, reviewedById: adminId, reviewedAt: new Date() },
    });
    await this.audit.record({
      userId: adminId,
      action: 'finance.deposit.approve',
      entity: 'DepositRequest',
      entityId: req.id,
      metadata: { amount: req.amount.toString(), method: req.method, simulated },
    });
    return { ok: true, status: 'APPROVED', reference: entry.reference };
  }

  async rejectDepositRequest(adminId: string, requestId: string, reason?: string) {
    const req = await this.prisma.depositRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Deposit request not found');
    if (req.status !== 'PENDING') throw new BadRequestException('Deposit request is not pending');
    await this.prisma.depositRequest.update({
      where: { id: req.id },
      data: { status: 'REJECTED', reviewedById: adminId, reviewedAt: new Date() },
    });
    await this.audit.record({ userId: adminId, action: 'finance.deposit.reject', entity: 'DepositRequest', entityId: req.id, metadata: { reason } });
    return { ok: true, status: 'REJECTED' };
  }

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
