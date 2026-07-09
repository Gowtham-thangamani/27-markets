import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DepositRequestStatus, JournalKind, JournalStatus, PostingDirection } from '@prisma/client';
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

  /** All deposit requests with their client, optionally filtered by status. */
  async allDepositRequests(status?: DepositRequestStatus) {
    const reqs = await this.prisma.depositRequest.findMany({
      where: status ? { status } : undefined,
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
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
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

    await this.accrueReferralCommission(req.userId, req.amount.toString(), entry.reference);
    return { ok: true, status: 'APPROVED', reference: entry.reference };
  }

  /**
   * If the depositing client was referred by a partner, accrue an IB commission
   * = deposit × ib_commission_pct. Best-effort: never blocks the deposit.
   */
  private async accrueReferralCommission(clientUserId: string, depositAmount: string, reference: string) {
    try {
      const client = await this.prisma.user.findUnique({
        where: { id: clientUserId },
        select: { referredByPartnerId: true },
      });
      if (!client?.referredByPartnerId) return;

      const setting = await this.prisma.appSetting.findUnique({ where: { key: 'ib_commission_pct' } });
      const pct = Number(setting?.value ?? '0');
      if (!pct || pct <= 0) return;

      const commission = (Number(depositAmount) * pct) / 100;
      if (commission <= 0) return;

      await this.prisma.ibCommission.create({
        data: {
          partnerId: client.referredByPartnerId,
          clientId: clientUserId,
          amount: commission.toFixed(2),
          source: 'deposit',
          reference,
        },
      });
    } catch {
      // Commission accrual must never fail the deposit.
    }
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

  /** Withdrawals awaiting finance approval, with their payout destination. */
  async pendingWithdrawals() {
    const list = await this.listByKindStatus(JournalKind.WITHDRAWAL, JournalStatus.PENDING);
    const details = await this.prisma.withdrawalDetail.findMany({
      where: { journalEntryId: { in: list.map((e) => e.id) } },
    });
    const byId = new Map(details.map((d) => [d.journalEntryId, d]));
    return list.map((e) => ({ ...e, destination: byId.get(e.id) ?? null }));
  }

  /**
   * Every withdrawal with its payout destination, optionally filtered by status
   * (PENDING = awaiting review, POSTED = paid, REVERSED = rejected). Powers the
   * dedicated Withdrawal Requests admin page.
   *
   * NOTE: rejecting a withdrawal posts a compensating entry of the SAME
   * WITHDRAWAL kind with the client leg flipped to CREDIT. We only keep entries
   * whose client-facing leg is a DEBIT (real withdrawals), so those reversal
   * artifacts never show up as phantom "paid" rows.
   */
  async allWithdrawals(status?: JournalStatus) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { kind: JournalKind.WITHDRAWAL, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        postings: {
          include: { ledgerAccount: { include: { user: true, tradingAccount: true } } },
        },
      },
    });

    const rows = entries.flatMap((e) => {
      const leg = e.postings.find(
        (p) => p.ledgerAccount.userId && p.direction === PostingDirection.DEBIT,
      );
      if (!leg) return []; // reversal compensation entry — not a real withdrawal
      const u = leg.ledgerAccount.user;
      return [
        {
          id: e.id,
          reference: e.reference,
          status: e.status,
          amount: formatMoney(leg.amount),
          memo: e.memo,
          createdAt: e.createdAt,
          accountNumber: leg.ledgerAccount.tradingAccount?.number ?? null,
          client: u ? { id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email } : null,
        },
      ];
    });

    const details = await this.prisma.withdrawalDetail.findMany({
      where: { journalEntryId: { in: rows.map((e) => e.id) } },
    });
    const byId = new Map(details.map((d) => [d.journalEntryId, d]));
    return rows.map((e) => ({ ...e, destination: byId.get(e.id) ?? null }));
  }

  /** Recent completed deposits. */
  deposits() {
    return this.listByKindStatus(JournalKind.DEPOSIT, JournalStatus.POSTED);
  }

  /** Every client wallet (client-liability ledger account) with its live balance. */
  async listWallets() {
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { userId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        tradingAccount: { select: { number: true, type: true, mode: true, status: true } },
      },
    });
    return Promise.all(
      accounts.map(async (a) => ({
        id: a.id,
        code: a.code,
        currency: a.currency,
        balance: formatMoney(await this.ledger.balanceOf(a.id)),
        accountNumber: a.tradingAccount?.number ?? null,
        accountType: a.tradingAccount?.type ?? null,
        mode: a.tradingAccount?.mode ?? null,
        status: a.tradingAccount?.status ?? null,
        owner: a.user
          ? { id: a.user.id, name: `${a.user.firstName} ${a.user.lastName}`, email: a.user.email }
          : null,
      })),
    );
  }

  /** Withdrawal amount (USD) at/above which dual approval is required. 0 = disabled. */
  private async dualControlThreshold(): Promise<number> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: 'withdrawal_dual_control_usd' } });
    return Number(row?.value ?? '0') || 0;
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
    const amount = clientLeg ? Number(clientLeg.amount) : 0;
    const amountMinor = Math.round(amount * 100);
    const currency = clientLeg?.currency ?? 'USD';

    // Dual-control (maker/checker): for amounts at/above the configured threshold
    // (0 = disabled), a withdrawal needs two DISTINCT admin approvals before payout.
    const threshold = await this.dualControlThreshold();
    if (threshold > 0 && amount >= threshold) {
      const detail = await this.prisma.withdrawalDetail.findUnique({ where: { journalEntryId: entryId } });
      if (!detail?.firstApproverId) {
        await this.prisma.withdrawalDetail.update({
          where: { journalEntryId: entryId },
          data: { firstApproverId: adminId, firstApprovedAt: new Date() },
        });
        await this.audit.record({ userId: adminId, action: 'finance.withdrawal.first_approval', entity: 'JournalEntry', entityId: entryId });
        return { ok: true, status: 'AWAITING_SECOND_APPROVAL' as const };
      }
      if (detail.firstApproverId === adminId) {
        throw new BadRequestException('This withdrawal needs a second approval from a different admin.');
      }
      // A distinct second approver — fall through to the payout.
    }

    // Atomically claim the withdrawal (PENDING → POSTED). Only one approver can
    // win this conditional update, so concurrent approvals can't double-pay.
    const claimed = await this.prisma.journalEntry.updateMany({
      where: { id: entryId, status: JournalStatus.PENDING },
      data: { status: JournalStatus.POSTED },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('Withdrawal is not pending (already processed).');
    }

    let payout;
    try {
      payout = await this.payments.payout({
        reference: entry.reference,
        amountMinor,
        currency,
        metadata: { entryId },
      });
    } catch (err) {
      // Roll the claim back so a transient payout failure can be retried.
      await this.prisma.journalEntry.updateMany({
        where: { id: entryId, status: JournalStatus.POSTED },
        data: { status: JournalStatus.PENDING },
      });
      throw err;
    }

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
