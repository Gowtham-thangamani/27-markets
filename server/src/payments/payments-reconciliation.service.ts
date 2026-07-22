import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { JournalKind, PostingDirection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider';

export interface PspReconcileSummary {
  provider: string;
  window: { from: string; to: string };
  pspDeposits: number;
  ledgerEntries: number;
  /** Paid at the PSP but no ledger credit — money received, client not credited. */
  missingLedger: { id: string; amountMinor: number }[];
  /** Ledger amount differs from what the PSP settled. */
  amountMismatch: { id: string; pspMinor: number; ledgerMinor: number }[];
  /** Ledger credit with no matching paid PSP object — needs review. */
  unmatchedLedger: { idempotencyKey: string; reference: string }[];
  inSync: boolean;
}

/** How far back each reconciliation pass looks. */
const WINDOW_HOURS = 24;
/** Ignore PSP objects newer than this — the webhook may simply not have landed yet. */
const WEBHOOK_GRACE_MS = 15 * 60 * 1000;
/** How often the scheduled pass runs. */
const INTERVAL_MS = 60 * 60 * 1000;

/**
 * PSP ↔ ledger drift check. Every settled PSP deposit must have exactly one
 * matching POSTED ledger entry (linked by idempotencyKey `stripe:<session.id>`)
 * with the same amount — and vice versa. Read-only: drift is logged + audited
 * for finance review, never auto-corrected. A no-op when the active provider
 * has no queryable backend (simulation).
 */
@Injectable()
export class PaymentsReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PaymentsReconciliation');
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  onModuleInit(): void {
    if (!this.payments.listCompletedDeposits) return; // simulation: nothing to reconcile
    this.timer = setInterval(() => {
      void this.reconcile().catch((e) => this.logger.error(`reconciliation failed: ${(e as Error).message}`));
    }, INTERVAL_MS);
    this.timer.unref?.();
    this.logger.log(`PSP reconciliation scheduled hourly (${this.payments.name}).`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async reconcile(): Promise<PspReconcileSummary | null> {
    if (!this.payments.listCompletedDeposits) return null;

    const now = Date.now();
    const since = new Date(now - WINDOW_HOURS * 60 * 60 * 1000);

    const [pspDeposits, ledgerEntries] = await Promise.all([
      this.payments.listCompletedDeposits(since),
      this.prisma.journalEntry.findMany({
        where: {
          idempotencyKey: { startsWith: 'stripe:' },
          kind: JournalKind.DEPOSIT,
          createdAt: { gte: since },
        },
        include: { postings: true },
      }),
    ]);

    const ledgerByKey = new Map(ledgerEntries.map((e) => [e.idempotencyKey, e]));
    // The client CREDIT posting is the deposit amount.
    const creditMinor = (e: (typeof ledgerEntries)[number]) => {
      const credit = e.postings.find((p) => p.direction === PostingDirection.CREDIT);
      return credit ? Math.round(Number(credit.amount) * 100) : 0;
    };

    const missingLedger: PspReconcileSummary['missingLedger'] = [];
    const amountMismatch: PspReconcileSummary['amountMismatch'] = [];
    const matchedKeys = new Set<string>();

    for (const d of pspDeposits) {
      // Grace: a just-paid session may legitimately have no ledger entry yet.
      if (d.created * 1000 > now - WEBHOOK_GRACE_MS) continue;
      const key = `stripe:${d.id}`;
      const entry = ledgerByKey.get(key);
      if (!entry) {
        missingLedger.push({ id: d.id, amountMinor: d.amountMinor });
        continue;
      }
      matchedKeys.add(key);
      const ledgerMinor = creditMinor(entry);
      if (ledgerMinor !== d.amountMinor) {
        amountMismatch.push({ id: d.id, pspMinor: d.amountMinor, ledgerMinor });
      }
    }

    // Ledger entries in the window with no matching settled PSP deposit. Skip
    // entries younger than the grace period whose session might predate the
    // window edge — the next pass covers them.
    const pspIds = new Set(pspDeposits.map((d) => `stripe:${d.id}`));
    const unmatchedLedger = ledgerEntries
      .filter((e) => !pspIds.has(e.idempotencyKey) && !matchedKeys.has(e.idempotencyKey))
      .filter((e) => e.createdAt.getTime() < now - WEBHOOK_GRACE_MS)
      .map((e) => ({ idempotencyKey: e.idempotencyKey, reference: e.reference }));

    const inSync = !missingLedger.length && !amountMismatch.length && !unmatchedLedger.length;
    const summary: PspReconcileSummary = {
      provider: this.payments.name,
      window: { from: since.toISOString(), to: new Date(now).toISOString() },
      pspDeposits: pspDeposits.length,
      ledgerEntries: ledgerEntries.length,
      missingLedger,
      amountMismatch,
      unmatchedLedger,
      inSync,
    };

    if (!inSync) {
      this.logger.error(
        `PSP reconciliation DRIFT: ${missingLedger.length} paid-not-credited, ` +
          `${amountMismatch.length} amount mismatches, ${unmatchedLedger.length} unmatched ledger credits.`,
      );
      await this.audit.record({
        action: 'psp.reconcile.drift',
        entity: 'JournalEntry',
        metadata: { missingLedger, amountMismatch, unmatchedLedger, window: summary.window },
      });
    } else {
      this.logger.log(`PSP reconciliation: ${pspDeposits.length} deposits in sync over the last ${WINDOW_HOURS}h.`);
    }
    return summary;
  }
}
