import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JournalKind, JournalStatus, PostingDirection } from '@prisma/client';
import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { toMoney } from '../ledger/money';
import { generateTxReference } from '../common/reference';

/**
 * Turns confirmed PSP events into real ledger postings. Today only the Stripe
 * deposit-completed path is handled; it posts a REAL (simulated:false) deposit,
 * idempotent on the Stripe session id so webhook retries never double-credit.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async handleStripeEvent(event: Stripe.Event): Promise<{ handled: boolean }> {
    if (event.type !== 'checkout.session.completed') {
      this.logger.debug(`Ignoring Stripe event ${event.type}`);
      return { handled: false };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const tradingAccountId = session.metadata?.tradingAccountId;
    const amountMinor = session.amount_total ?? 0;
    if (!userId || !tradingAccountId || amountMinor <= 0) {
      throw new BadRequestException('Stripe session missing deposit metadata');
    }

    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: tradingAccountId },
      include: { ledgerAccount: true },
    });
    if (!account?.ledgerAccount || account.userId !== userId) {
      throw new NotFoundException('Deposit target account not found');
    }

    const clearing = await this.ledger.getSystemAccount('SYSTEM:PSP_CLEARING');
    const amount = toMoney(amountMinor / 100); // minor units → major

    const entry = await this.ledger.post({
      kind: JournalKind.DEPOSIT,
      reference: generateTxReference(),
      idempotencyKey: `stripe:${session.id}`, // idempotent across webhook retries
      simulated: false,
      status: JournalStatus.POSTED,
      createdById: userId,
      memo: 'Deposit via Stripe',
      postings: [
        { ledgerAccountId: clearing.id, direction: PostingDirection.DEBIT, amount },
        { ledgerAccountId: account.ledgerAccount.id, direction: PostingDirection.CREDIT, amount },
      ],
    });

    await this.audit.record({
      userId,
      action: 'funds.deposit.stripe',
      entity: 'JournalEntry',
      entityId: entry.id,
      metadata: { sessionId: session.id, amountMinor, simulated: false },
    });
    return { handled: true };
  }
}
