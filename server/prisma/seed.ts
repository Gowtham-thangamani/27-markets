/**
 * Database seed — creates staff + demo client accounts and sample CRM/blog data.
 * Idempotent: re-running upserts users and only adds sample rows when missing.
 *
 *   npm run db:seed
 *
 * Logins (all passwords below are for local/dev only):
 *   admin@27markets.io   / Admin123!     (ADMIN)
 *   agent@27markets.io   / Agent123!     (AGENT)
 *   client@27markets.io  / Client123!    (CLIENT, funded demo data)
 */
import {
  PrismaClient,
  Prisma,
  UserRole,
  AccountType,
  AccountMode,
  LedgerAccountType,
  JournalKind,
  PostingDirection,
  PostStatus,
  LeadSource,
  LeadStatus,
  TicketPriority,
  TicketStatus,
} from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function upsertUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: UserRole,
) {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
  return prisma.user.upsert({
    where: { email },
    update: { role },
    create: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      kycProfile: { create: {} },
    },
  })
}

async function main() {
  console.log('Seeding…')

  const admin = await upsertUser('admin@27markets.io', 'Admin123!', 'Avery', 'Stone', UserRole.ADMIN)
  const agent = await upsertUser('agent@27markets.io', 'Agent123!', 'Riley', 'Mensah', UserRole.AGENT)
  const client = await upsertUser('client@27markets.io', 'Client123!', 'Jordan', 'Avery', UserRole.CLIENT)

  // ── Funded trading account for the demo client (via double-entry ledger) ──
  const accountNumber = '20010001'
  let account = await prisma.tradingAccount.findUnique({ where: { number: accountNumber } })
  if (!account) {
    account = await prisma.tradingAccount.create({
      data: {
        number: accountNumber,
        userId: client.id,
        type: AccountType.RAW_SPREAD,
        mode: AccountMode.LIVE,
        leverage: '1:500',
      },
    })
    const clientLedger = await prisma.ledgerAccount.create({
      data: {
        code: `CLIENT:${account.id}`,
        name: `Client balance ${accountNumber}`,
        type: LedgerAccountType.LIABILITY,
        userId: client.id,
        tradingAccountId: account.id,
      },
    })
    const clearing = await prisma.ledgerAccount.upsert({
      where: { code: 'SYSTEM:PSP_CLEARING' },
      update: {},
      create: { code: 'SYSTEM:PSP_CLEARING', name: 'PSP / Bank Clearing', type: LedgerAccountType.ASSET },
    })
    const amount = new Prisma.Decimal('10000')
    await prisma.journalEntry.create({
      data: {
        reference: 'TX-SEED01',
        kind: JournalKind.DEPOSIT,
        idempotencyKey: `seed-deposit:${account.id}`,
        simulated: true,
        memo: 'Seed deposit',
        postings: {
          create: [
            { ledgerAccountId: clearing.id, direction: PostingDirection.DEBIT, amount },
            { ledgerAccountId: clientLedger.id, direction: PostingDirection.CREDIT, amount },
          ],
        },
      },
    })
  }

  // ── Blog posts (authored by admin) ──
  if ((await prisma.blogPost.count()) === 0) {
    await prisma.blogPost.createMany({
      data: [
        {
          slug: 'understanding-spreads-and-commissions',
          title: 'Understanding Spreads and Commissions',
          excerpt: 'How raw spreads and per-lot commissions compare, and which account type fits your strategy.',
          contentHtml:
            '<h2>What is a spread?</h2><p>The spread is the difference between the bid and ask price. On a Raw Spread account you pay near-zero spreads plus a fixed commission per lot.</p><p>Choosing between Standard and Raw Spread comes down to your trading volume and style.</p>',
          status: PostStatus.PUBLISHED,
          publishedAt: new Date('2026-06-10T09:00:00Z'),
          authorId: admin.id,
        },
        {
          slug: 'risk-management-for-leveraged-trading',
          title: 'Risk Management for Leveraged Trading',
          excerpt: 'Leverage amplifies both gains and losses. Here are the fundamentals of protecting your capital.',
          contentHtml:
            '<h2>Position sizing</h2><p>Never risk more than a small percentage of your account on a single trade. Use stop-loss orders and understand margin requirements before increasing leverage.</p>',
          status: PostStatus.PUBLISHED,
          publishedAt: new Date('2026-06-15T09:00:00Z'),
          authorId: admin.id,
        },
        {
          slug: 'platform-release-5-2',
          title: 'Platform Release 5.2 — What’s New',
          excerpt: 'Faster execution, redesigned charts, and biometric login across mobile.',
          contentHtml: '<p>Our latest release focuses on speed and security. Full notes coming soon.</p>',
          status: PostStatus.DRAFT,
          authorId: admin.id,
        },
      ],
    })
  }

  // ── Sample CRM leads ──
  if ((await prisma.lead.count()) === 0) {
    await prisma.lead.createMany({
      data: [
        { name: 'Maya Rahman', email: 'maya@example.com', phone: '+971 50 111 2222', country: 'UAE', source: LeadSource.DEMO, status: LeadStatus.NEW, assignedToId: agent.id },
        { name: 'Tom Becker', email: 'tom@example.com', country: 'Germany', source: LeadSource.REGISTER, status: LeadStatus.CONTACTED, assignedToId: agent.id },
        { name: 'Sofia Lin', email: 'sofia@example.com', country: 'Singapore', source: LeadSource.MANUAL, status: LeadStatus.QUALIFIED },
      ],
    })
  }

  // ── Sample support ticket for the demo client ──
  if ((await prisma.ticket.count()) === 0) {
    await prisma.ticket.create({
      data: {
        userId: client.id,
        subject: 'Withdrawal taking longer than expected',
        category: 'Funding',
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        messages: {
          create: [{ authorId: client.id, body: 'My card withdrawal has been pending for two days.' }],
        },
      },
    })
  }

  console.log('Seed complete.')
  console.log('  admin@27markets.io / Admin123!')
  console.log('  agent@27markets.io / Agent123!')
  console.log('  client@27markets.io / Client123!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
