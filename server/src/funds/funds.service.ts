import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { JournalKind, JournalStatus, KycStepStatus, PostingDirection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AccountsService } from '../accounts/accounts.service';
import { AuditService } from '../audit/audit.service';
import { formatMoney, toMoney } from '../ledger/money';
import { generateTxReference } from '../common/reference';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider';
import type { Env } from '../config/env.validation';
import { DepositDto, RequestDepositDto, WithdrawDto, TransferDto } from './dto';

@Injectable()
export class FundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Begin a deposit. With a hosted PSP (Stripe) this returns a checkout URL the
   * client is redirected to; the webhook credits the deposit on success. In
   * SIMULATION the provider has no redirect, so we credit inline (legacy path).
   */
  async depositCheckout(userId: string, dto: DepositDto) {
    this.payments.assertAvailable();
    // Validates ownership of the target account.
    await this.accounts.ledgerAccountIdFor(userId, dto.accountId);

    const origin = (this.config.get('CLIENT_ORIGIN', { infer: true }).split(',')[0] || '').trim() || 'http://localhost:5173';
    const checkout = await this.payments.createDepositCheckout({
      userId,
      tradingAccountId: dto.accountId,
      amountMinor: Math.round(Number(dto.amount) * 100),
      currency: 'USD',
      successUrl: `${origin}/portal/funds?deposit=success`,
      cancelUrl: `${origin}/portal/funds?deposit=cancelled`,
    });

    if (!checkout.url) {
      // Simulation / inline-credit providers: post the deposit immediately.
      return this.deposit(userId, dto);
    }
    return { checkoutUrl: checkout.url };
  }

  /** Configured deposit instructions (bank details, crypto addresses). */
  private depositInstructions() {
    const bank = this.config.get('BANK_DEPOSIT_DETAILS', { infer: true }) ?? null;
    const assets = (
      [
        ['BTC', this.config.get('CRYPTO_BTC_ADDRESS', { infer: true })],
        ['ETH', this.config.get('CRYPTO_ETH_ADDRESS', { infer: true })],
        ['USDT', this.config.get('CRYPTO_USDT_ADDRESS', { infer: true })],
      ] as const
    )
      .filter(([, address]) => !!address)
      .map(([symbol, address]) => ({ symbol, address: address as string }));
    return { bank, assets };
  }

  /** The deposit rails on offer and whether each is live/manual/unavailable. */
  depositMethods() {
    const cardLive = this.payments.name === 'stripe';
    const { bank, assets } = this.depositInstructions();
    return [
      { id: 'card', label: 'Credit / Debit Card', type: 'card', status: cardLive ? 'live' : 'unavailable', note: cardLive ? 'Instant · Visa/Mastercard' : 'Connect Stripe to enable' },
      { id: 'bank', label: 'Bank Transfer', type: 'bank', status: bank ? 'manual' : 'unavailable', note: '1–3 business days', instructions: bank },
      { id: 'crypto', label: 'Crypto', type: 'crypto', status: assets.length ? 'manual' : 'unavailable', note: 'BTC · ETH · USDT', assets },
      { id: 'ewallet', label: 'E-Wallets', type: 'ewallet', status: 'unavailable', note: 'Skrill / Neteller — provider pending' },
    ];
  }

  /**
   * Start a deposit on the chosen rail. Card → hosted PSP checkout. Bank/crypto →
   * a deposit REQUEST: the client gets pay-in instructions, real funds arrive
   * off-platform, and finance confirms receipt before the ledger is credited.
   */
  async requestDeposit(userId: string, dto: RequestDepositDto) {
    await this.accounts.ledgerAccountIdFor(userId, dto.accountId); // validates ownership

    if (dto.method === 'card') {
      return this.depositCheckout(userId, { accountId: dto.accountId, amount: dto.amount, method: 'Card' } as DepositDto);
    }

    const { bank, assets } = this.depositInstructions();
    let instructions: string;
    let address: string | null = null;
    let qr: string | null = null;
    if (dto.method === 'bank') {
      if (!bank) throw new BadRequestException('Bank transfer is not available.');
      instructions = bank;
    } else {
      const asset = assets.find((a) => a.symbol === dto.asset);
      if (!asset) throw new BadRequestException('Unsupported or unavailable crypto asset.');
      address = asset.address;
      instructions = `Send ${asset.symbol} to:\n${asset.address}`;
      // Scannable QR of the wallet address (scan with a wallet app).
      qr = await QRCode.toDataURL(asset.address, { margin: 1, width: 220 });
    }

    const reference = generateTxReference();
    const req = await this.prisma.depositRequest.create({
      data: { userId, accountId: dto.accountId, method: dto.method, asset: dto.asset ?? null, amount: dto.amount, reference, status: 'PENDING' },
    });
    await this.audit.record({ userId, action: 'funds.deposit.request', entity: 'DepositRequest', entityId: req.id, metadata: { method: dto.method, asset: dto.asset, amount: dto.amount } });
    return { reference, status: 'PENDING' as const, method: dto.method, amount: formatMoney(toMoney(dto.amount)), instructions, address, qr };
  }

  /** A client's recent deposit requests (bank/crypto), newest first. */
  myDepositRequests(userId: string) {
    return this.prisma.depositRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

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

    await this.audit.record({ userId, action: 'funds.deposit', entity: 'JournalEntry', entityId: entry.id, metadata: { amount: dto.amount, method: dto.method, simulated: this.payments.simulated } });
    return { reference: entry.reference, status: entry.status, simulated: this.payments.simulated, amount: formatMoney(amount) };
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

    // Capture + validate the payout destination so finance pays the right place.
    const destMethod: 'bank' | 'crypto' = dto.walletAddress ? 'crypto' : 'bank';
    if (destMethod === 'crypto') {
      if (!dto.walletAddress) throw new BadRequestException('A wallet address is required for crypto withdrawals.');
    } else if (!dto.accountName || !dto.accountNumber) {
      throw new BadRequestException('Account holder name and account number/IBAN are required for bank withdrawals.');
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

    await this.prisma.withdrawalDetail.create({
      data: {
        journalEntryId: entry.id,
        method: destMethod,
        accountName: dto.accountName ?? null,
        accountNumber: dto.accountNumber ?? null,
        bankName: dto.bankName ?? null,
        swift: dto.swift ?? null,
        walletAddress: dto.walletAddress ?? null,
        network: dto.network ?? null,
      },
    });

    await this.audit.record({ userId, action: 'funds.withdraw', entity: 'JournalEntry', entityId: entry.id, metadata: { amount: dto.amount, method: dto.method, destMethod, simulated: this.payments.simulated, status: entry.status } });
    return { reference: entry.reference, status: entry.status, simulated: this.payments.simulated, amount: formatMoney(amount) };
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
