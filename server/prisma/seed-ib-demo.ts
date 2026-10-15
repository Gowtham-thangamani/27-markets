/**
 * One-off, narrowly-scoped demo-data seed for the IB partner portal.
 *
 * Unlike seed.ts (full platform demo data, dev-only), this only touches the
 * partner@27markets.io tree: it's safe to run once against production so the
 * portal has a believable example to walk a client through — referred
 * clients across the funnel, a sub-partner (2-tier commissions), and payout
 * history — instead of showing an all-zeros dashboard.
 *
 * Idempotent: no-ops if the demo data already exists (checked via the
 * ibdemo+ email prefix). Runs as a single transaction — if anything fails
 * partway, everything rolls back and the database is left untouched.
 *
 *   npx ts-node prisma/seed-ib-demo.ts
 */
import {
  PrismaClient,
  Prisma,
  UserRole,
  AccountType,
  AccountMode,
  LedgerAccountType,
  JournalKind,
  JournalStatus,
  PostingDirection,
  KycStepStatus,
  ConversionStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;

const DEMO_PREFIX = 'ibdemo+';
const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

interface ClientSpec {
  slug: string;
  first: string;
  last: string;
  country: string;
  daysAgo: number;
  kyc: 'APPROVED' | 'PENDING' | 'NOT_SUBMITTED';
  deposit: number; // 0 = not funded yet
  conversion: ConversionStatus;
  campaign: string | null;
  accountNo: string;
}

async function makeClient(
  tx: Tx,
  spec: ClientSpec,
  referredByPartnerId: string,
  clearingId: string,
  passwordHash: string,
) {
  const created = daysAgo(spec.daysAgo);
  const user = await tx.user.create({
    data: {
      email: `${DEMO_PREFIX}${spec.slug}@27markets.io`,
      passwordHash,
      firstName: spec.first,
      lastName: spec.last,
      country: spec.country,
      role: UserRole.CLIENT,
      emailVerified: true,
      acceptedTermsAt: created,
      createdAt: created,
      referredByPartnerId,
      conversionStatus: spec.conversion,
      convertedAt: spec.conversion === 'CONVERTED' ? daysAgo(Math.max(spec.daysAgo - 3, 0)) : null,
      campaignCode: spec.campaign,
      kycProfile: {
        create:
          spec.kyc === 'APPROVED'
            ? { identityStatus: KycStepStatus.APPROVED, addressStatus: KycStepStatus.APPROVED, selfieStatus: KycStepStatus.APPROVED }
            : spec.kyc === 'PENDING'
              ? { identityStatus: KycStepStatus.PENDING }
              : {},
      },
    },
  });

  if (spec.deposit > 0) {
    const account = await tx.tradingAccount.create({
      data: { number: spec.accountNo, userId: user.id, type: AccountType.STANDARD, mode: AccountMode.LIVE, leverage: '1:50', createdAt: created },
    });
    const ledger = await tx.ledgerAccount.create({
      data: { code: `CLIENT:${account.id}`, name: `Client balance ${spec.accountNo}`, type: LedgerAccountType.LIABILITY, userId: user.id, tradingAccountId: account.id },
    });
    const amount = new Prisma.Decimal(spec.deposit);
    await tx.journalEntry.create({
      data: {
        reference: `TX-IBDEMO-${spec.slug}`,
        kind: JournalKind.DEPOSIT,
        idempotencyKey: `ibdemo-deposit:${account.id}`,
        simulated: true,
        status: JournalStatus.POSTED,
        memo: 'IB demo deposit',
        createdAt: daysAgo(Math.max(spec.daysAgo - 1, 0)),
        postings: {
          create: [
            { ledgerAccountId: clearingId, direction: PostingDirection.DEBIT, amount },
            { ledgerAccountId: ledger.id, direction: PostingDirection.CREDIT, amount },
          ],
        },
      },
    });
  }

  return user;
}

async function seed(tx: Tx, partnerId: string) {
  const passwordHash = await argon2.hash('Client123!', { type: argon2.argon2id });

  const clearing = await tx.ledgerAccount.upsert({
    where: { code: 'SYSTEM:PSP_CLEARING' },
    update: {},
    create: { code: 'SYSTEM:PSP_CLEARING', name: 'PSP / Bank Clearing', type: LedgerAccountType.ASSET },
  });

  // ── Sub-partner (2-tier demo): joins under the main partner, brings her own clients ──
  const subUser = await tx.user.create({
    data: {
      email: `${DEMO_PREFIX}subpartner@27markets.io`,
      passwordHash,
      firstName: 'Nadia',
      lastName: 'Petrova',
      country: 'United Arab Emirates',
      role: UserRole.PARTNER,
      emailVerified: true,
      acceptedTermsAt: daysAgo(55),
      createdAt: daysAgo(55),
      partnerProfile: { create: { referralCode: 'DEMOSUB1', parentPartnerId: partnerId } },
    },
  });

  // ── Direct referrals: span the funnel — fresh signups through converted + funded ──
  const direct: ClientSpec[] = [
    { slug: 'emma', first: 'Emma', last: 'Clarke', country: 'United Kingdom', daysAgo: 70, kyc: 'APPROVED', deposit: 1200, conversion: 'CONVERTED', campaign: 'IB-YT', accountNo: '410001' },
    { slug: 'noah', first: 'Noah', last: 'Fischer', country: 'Germany', daysAgo: 60, kyc: 'APPROVED', deposit: 3400, conversion: 'CONVERTED', campaign: 'IB-RAMADAN', accountNo: '410002' },
    { slug: 'aisha', first: 'Aisha', last: 'Rahman', country: 'United Arab Emirates', daysAgo: 50, kyc: 'APPROVED', deposit: 800, conversion: 'ON_BOARDING', campaign: null, accountNo: '410003' },
    { slug: 'liam', first: 'Liam', last: 'Tan', country: 'Singapore', daysAgo: 40, kyc: 'PENDING', deposit: 0, conversion: 'NO_ANSWER', campaign: 'IB-YT', accountNo: '410004' },
    { slug: 'sofia', first: 'Sofia', last: 'Rossi', country: 'Italy', daysAgo: 32, kyc: 'APPROVED', deposit: 2100, conversion: 'CONVERTED', campaign: null, accountNo: '410005' },
    { slug: 'ethan', first: 'Ethan', last: 'Brooks', country: 'Canada', daysAgo: 24, kyc: 'NOT_SUBMITTED', deposit: 0, conversion: 'NO_ANSWER', campaign: 'IB-RAMADAN', accountNo: '410006' },
    { slug: 'mia', first: 'Mia', last: 'Andersson', country: 'Sweden', daysAgo: 15, kyc: 'APPROVED', deposit: 560, conversion: 'ON_BOARDING', campaign: 'IB-YT', accountNo: '410007' },
    { slug: 'zayn', first: 'Zayn', last: 'Malik', country: 'Pakistan', daysAgo: 6, kyc: 'PENDING', deposit: 0, conversion: 'NO_ANSWER', campaign: null, accountNo: '410008' },
    { slug: 'chloe', first: 'Chloe', last: 'Martin', country: 'France', daysAgo: 2, kyc: 'NOT_SUBMITTED', deposit: 0, conversion: 'NO_ANSWER', campaign: null, accountNo: '410009' },
  ];
  const directUsers = new Map<string, Awaited<ReturnType<typeof makeClient>>>();
  for (const spec of direct) {
    directUsers.set(spec.slug, await makeClient(tx, spec, partnerId, clearing.id, passwordHash));
  }

  // ── Sub-partner's own referrals (feed the main partner's level-2/indirect commission) ──
  const subClients: ClientSpec[] = [
    { slug: 'omar', first: 'Omar', last: 'Haddad', country: 'Jordan', daysAgo: 45, kyc: 'APPROVED', deposit: 1500, conversion: 'CONVERTED', campaign: null, accountNo: '410010' },
    { slug: 'yuki', first: 'Yuki', last: 'Tanaka', country: 'Japan', daysAgo: 30, kyc: 'APPROVED', deposit: 900, conversion: 'ON_BOARDING', campaign: null, accountNo: '410011' },
    { slug: 'lucas', first: 'Lucas', last: 'Silva', country: 'Brazil', daysAgo: 10, kyc: 'PENDING', deposit: 0, conversion: 'NO_ANSWER', campaign: null, accountNo: '410012' },
  ];
  const subUsers = new Map<string, Awaited<ReturnType<typeof makeClient>>>();
  for (const spec of subClients) {
    subUsers.set(spec.slug, await makeClient(tx, spec, subUser.id, clearing.id, passwordHash));
  }

  // ── Commissions: level 1 for the direct funded clients, level 2 for the main
  //    partner off the sub-partner's funded clients (illustrates the 2-tier feature). ──
  const commission = async (partnerId2: string, clientId: string, level: number, amount: number, createdAt: Date) =>
    tx.ibCommission.create({
      data: { partnerId: partnerId2, clientId, level, amount: new Prisma.Decimal(amount), source: 'deposit', createdAt },
    });

  const emma = directUsers.get('emma')!, noah = directUsers.get('noah')!, aisha = directUsers.get('aisha')!;
  const sofiaC = directUsers.get('sofia')!, mia = directUsers.get('mia')!;
  const omar = subUsers.get('omar')!, yuki = subUsers.get('yuki')!;

  const c1 = await commission(partnerId, emma.id, 1, 120, daysAgo(69));
  const c2 = await commission(partnerId, noah.id, 1, 340, daysAgo(59));
  const c3 = await commission(partnerId, aisha.id, 1, 80, daysAgo(49));
  await commission(partnerId, sofiaC.id, 1, 210, daysAgo(31)); // left AVAILABLE
  await commission(partnerId, mia.id, 1, 56, daysAgo(14)); // left AVAILABLE
  // Indirect (level 2): the sub-partner's clients funding, credited to the main partner.
  await commission(partnerId, omar.id, 2, 30, daysAgo(44)); // left AVAILABLE
  await commission(partnerId, yuki.id, 2, 18, daysAgo(29)); // left AVAILABLE
  // The sub-partner's own level-1 cut on her clients (for when she logs in herself).
  await commission(subUser.id, omar.id, 1, 150, daysAgo(44));
  await commission(subUser.id, yuki.id, 1, 90, daysAgo(29));

  // ── Payout history: one paid, one still under review; the rest stays available. ──
  const paid = await tx.partnerPayout.create({
    data: { partnerId, amount: new Prisma.Decimal(460), status: 'PAID', reference: 'PO-DEMO-0001', createdAt: daysAgo(20), reviewedAt: daysAgo(18) },
  });
  await tx.ibCommission.updateMany({ where: { id: { in: [c1.id, c2.id] } }, data: { payoutId: paid.id } });

  const pending = await tx.partnerPayout.create({
    data: { partnerId, amount: new Prisma.Decimal(80), status: 'PENDING', reference: 'PO-DEMO-0002', createdAt: daysAgo(2) },
  });
  await tx.ibCommission.updateMany({ where: { id: c3.id }, data: { payoutId: pending.id } });
}

async function main() {
  const partner = await prisma.user.findUnique({ where: { email: 'partner@27markets.io' } });
  if (!partner) {
    console.log('partner@27markets.io not found — seed that account first. Skipping.');
    return;
  }

  const already = await prisma.user.count({ where: { email: { startsWith: DEMO_PREFIX } } });
  if (already > 0) {
    console.log('IB demo data already present — skipping.');
    return;
  }

  console.log('Seeding IB portal demo data (single transaction)…');
  await prisma.$transaction((tx) => seed(tx, partner.id), { timeout: 30000, maxWait: 10000 });
  console.log('IB demo data seeded: 1 sub-partner, 12 referred clients, 9 commission rows, 2 payouts.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
