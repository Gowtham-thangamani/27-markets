import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { JournalKind, JournalStatus, KycStepStatus, PostingDirection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AccountsService } from '../accounts/accounts.service';
import { AuditService } from '../audit/audit.service';
import { formatMoney, toMoney } from '../ledger/money';
import { generateTxReference } from '../common/reference';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider';
import { DepositDto, WithdrawDto, TransferDto } from './dto';

@Injectable()
export class FundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  async deposit(userId: string, dto: DepositDto) {
    // SAFETY RAIL: refuses unless a payment provider can actually move funds.
    this.payments.assertAvailable();
    const amount = toMoney(dto.amount);
    const clientLedgerId = await this.accounts.ledgerAccountIdFor(userId, dto.accountId);
    const clearing = await this.ledger.getSystemAccount('SYSTEM:PSP_CLEARING');

    // Real deposit shape: firm asset (clearing) up, client liability up.
    const entry = await this.ledger.post({
      kind: JournalKind.DEPOSIT,
      reference: generateTxReference(),
      idempotencyKey: dto.idempotencyKey ?? `deposit:${userId}:${randomUUID()}`,
      simulated: this.payments.simulated,
      createdById: userId,
      memo: `Deposit via ${dto.method}`,
      postings: [
        { ledgerAccountId: clearing.id, direction: PostingDirection.DEBIT, amount },
        { ledgerAccountId: clientLedgerId, direction: PostingDirection.CREDIT, amount },
      ],
    });

    await this.audit.record({ userId, action: 'funds.deposit', entity: 'JournalEntry', entityId: entry.id, metadata: { amount: dto.amount, method: dto.method, simulated: true } });
    return { reference: entry.reference, status: entry.status, simulated: true, amount: formatMoney(amount) };
  }

  /**
   * Withdrawals require completed KYC — a core AML/CFT control. Deposits and
   * internal transfers are not gated; getting money OUT is.
   */
  private async assertKycVerified(userId: string): Promise<void> {
    const kyc = await this.prisma.kycProfile.findUnique({ where: { userId } });
    const verified =
      kyc &&
      kyc.identityStatus === KycStepStatus.APPROVED &&
      kyc.addressStatus === KycStepStatus.APPROVED &&
      kyc.selfieStatus === KycStepStatus.APPROVED;
    if (!verified) {
      throw new ForbiddenException(
        'Complete identity verification (KYC) before withdrawing funds.',
      );
    }
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    this.payments.assertAvailable();
    await this.assertKycVerified(userId);
    const amount = toMoney(dto.amount);
    const clientLedgerId = await this.accounts.ledgerAccountIdFor(userId, dto.accountId);

    const balance = await this.ledger.balanceOf(clientLedgerId);
    if (balance.lessThan(amount)) {
      throw new BadRequestException('Insufficient balance for this withdrawal');
    }

    const payable = await this.ledger.getSystemAccount('SYSTEM:WITHDRAWALS_PAYABLE');
    // Created PENDING: the posting holds the balance immediately, but the payout
    // awaits finance approval (markPosted) or rejection (reverse).
    const entry = await this.ledger.post({
      kind: JournalKind.WITHDRAWAL,
      reference: generateTxReference(),
      idempotencyKey: dto.idempotencyKey ?? `withdraw:${userId}:${randomUUID()}`,
      simulated: this.payments.simulated,
      status: JournalStatus.PENDING,
      createdById: userId,
      memo: `Withdrawal via ${dto.method}`,
      postings: [
        { ledgerAccountId: clientLedgerId, direction: PostingDirection.DEBIT, amount },
        { ledgerAccountId: payable.id, direction: PostingDirection.CREDIT, amount },
      ],
    });

    await this.audit.record({ userId, action: 'funds.withdraw', entity: 'JournalEntry', entityId: entry.id, metadata: { amount: dto.amount, method: dto.method, simulated: true, status: entry.status } });
    return { reference: entry.reference, status: entry.status, simulated: true, amount: formatMoney(amount) };
  }

  async transfer(userId: string, dto: TransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination accounts must differ');
    }
    const amount = toMoney(dto.amount);
    const fromId = await this.accounts.ledgerAccountIdFor(userId, dto.fromAccountId);
    const toId = await this.accounts.ledgerAccountIdFor(userId, dto.toAccountId);

    const balance = await this.ledger.balanceOf(fromId);
    if (balance.lessThan(amount)) {
      throw new BadRequestException('Insufficient balance for this transfer');
    }

    const entry = await this.ledger.post({
      kind: JournalKind.TRANSFER,
      reference: generateTxReference(),
      idempotencyKey: dto.idempotencyKey ?? `transfer:${userId}:${randomUUID()}`,
      simulated: this.payments.simulated,
      createdById: userId,
      memo: 'Internal transfer',
      postings: [
        { ledgerAccountId: fromId, direction: PostingDirection.DEBIT, amount },
        { ledgerAccountId: toId, direction: PostingDirection.CREDIT, amount },
      ],
    });

    await this.audit.record({ userId, action: 'funds.transfer', entity: 'JournalEntry', entityId: entry.id, metadata: { amount: dto.amount } });
    return { reference: entry.reference, status: entry.status, amount: formatMoney(amount) };
  }

  /** Transaction history across all of a user's accounts, newest first. */
  async history(userId: string) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { postings: { some: { ledgerAccount: { userId } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { postings: { include: { ledgerAccount: true } } },
    });

    return entries.map((e) => {
      // The client-facing leg is the posting on one of the user's ledger accounts.
      const clientLeg = e.postings.find((p) => p.ledgerAccount.userId === userId);
      const signed =
        clientLeg && clientLeg.direction === PostingDirection.CREDIT
          ? clientLeg.amount
          : clientLeg
            ? clientLeg.amount.negated()
            : toMoney(0);
      return {
        reference: e.reference,
        kind: e.kind,
        status: e.status,
        simulated: e.simulated,
        amount: formatMoney(clientLeg ? clientLeg.amount : toMoney(0)),
        signedAmount: formatMoney(signed),
        date: e.createdAt,
        memo: e.memo,
      };
    });
  }
}
