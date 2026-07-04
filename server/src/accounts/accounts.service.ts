import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountMode,
  AccountType,
  JournalKind,
  LedgerAccountType,
  PostingDirection,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import type { Env } from '../config/env.validation';
import { formatMoney, toMoney } from '../ledger/money';
import { generateAccountNumber, generateTxReference } from '../common/reference';

const DEMO_STARTING_BALANCE = '50000';
const DEFAULT_LEVERAGE: Record<AccountType, string> = {
  STANDARD: '1:400',
  RAW_SPREAD: '1:500',
  VIP: '1:500',
};

export interface AccountView {
  id: string;
  number: string;
  type: AccountType;
  mode: AccountMode;
  currency: string;
  leverage: string;
  status: string;
  balance: string;
  createdAt: Date;
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async create(userId: string, type: AccountType, mode: AccountMode): Promise<AccountView> {
    // Simulation rail: real (LIVE) accounts must not be created until go-live.
    if (mode === AccountMode.LIVE && !this.config.get('ALLOW_LIVE_MODE', { infer: true })) {
      throw new BadRequestException(
        'Live accounts are not available yet. Real funds are disabled until the platform is licensed and go-live is enabled.',
      );
    }

    const number = generateAccountNumber(mode);

    const account = await this.prisma.tradingAccount.create({
      data: {
        number,
        userId,
        type,
        mode,
        leverage: DEFAULT_LEVERAGE[type],
      },
    });

    // Every trading account is backed by a client-liability ledger account.
    const ledgerAccount = await this.ledger.ensureAccount({
      code: `CLIENT:${account.id}`,
      name: `Client balance ${number}`,
      type: LedgerAccountType.LIABILITY,
      userId,
      tradingAccountId: account.id,
    });

    // Demo accounts are seeded with virtual funds via a balanced entry.
    if (mode === AccountMode.DEMO) {
      const demoFunding = await this.ledger.getSystemAccount('SYSTEM:DEMO_FUNDING');
      await this.ledger.post({
        kind: JournalKind.ADJUSTMENT,
        reference: generateTxReference(),
        idempotencyKey: `demo-seed:${account.id}`,
        simulated: true,
        createdById: userId,
        memo: 'Demo account virtual funding',
        postings: [
          { ledgerAccountId: demoFunding.id, direction: PostingDirection.DEBIT, amount: toMoney(DEMO_STARTING_BALANCE) },
          { ledgerAccountId: ledgerAccount.id, direction: PostingDirection.CREDIT, amount: toMoney(DEMO_STARTING_BALANCE) },
        ],
      });
    }

    await this.audit.record({ userId, action: 'accounts.create', entity: 'TradingAccount', entityId: account.id, metadata: { type, mode } });
    return this.toView(account.id, userId);
  }

  async list(userId: string): Promise<AccountView[]> {
    const accounts = await this.prisma.tradingAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(accounts.map((a) => this.toView(a.id, userId)));
  }

  async get(userId: string, id: string): Promise<AccountView> {
    return this.toView(id, userId);
  }

  /** Resolve the ledger account id for a user's trading account (ownership-checked). */
  async ledgerAccountIdFor(userId: string, tradingAccountId: string): Promise<string> {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: tradingAccountId },
      include: { ledgerAccount: true },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Not your account');
    if (!account.ledgerAccount) throw new NotFoundException('Ledger account missing');
    return account.ledgerAccount.id;
  }

  private async toView(id: string, userId: string): Promise<AccountView> {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id },
      include: { ledgerAccount: true },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Not your account');

    const balance = account.ledgerAccount
      ? await this.ledger.balanceOf(account.ledgerAccount.id)
      : toMoney(0);

    return {
      id: account.id,
      number: account.number,
      type: account.type,
      mode: account.mode,
      currency: account.currency,
      leverage: account.leverage,
      status: account.status,
      balance: formatMoney(balance),
      createdAt: account.createdAt,
    };
  }
}
