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
 *
 * SAFETY: this demo seed creates well-known default credentials and MUST NOT run
 * against a production database. It self-aborts when NODE_ENV=production unless
 * ALLOW_SEED=true is explicitly set. Provision the first real admin via a
 * separate one-time script that reads its password from a secret.
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
  PostStatus,
  LeadSource,
  LeadStatus,
  KycStepStatus,
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
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    console.log(
      'Refusing to run the demo seed in production (default credentials). ' +
        'Set ALLOW_SEED=true only if you really mean to. Skipping.',
    )
    return
  }
  console.log('Seeding…')

  // Account type configs (editable from the admin CRM).
  const accountTypeConfigs = [
    { type: AccountType.STANDARD, displayName: 'Standard', spreadFrom: '0.8', commission: '$0', leverage: '1:10', minDeposit: 50, popular: false, sortOrder: 0 },
    { type: AccountType.RAW_SPREAD, displayName: 'Raw Spread', spreadFrom: '0.0', commission: '$7 / lot', leverage: '1:50', minDeposit: 500, popular: true, sortOrder: 1 },
    { type: AccountType.VIP, displayName: 'VIP', spreadFrom: '0.0', commission: 'Custom', leverage: '1:100', minDeposit: 2500, popular: false, sortOrder: 2 },
  ]
  for (const cfg of accountTypeConfigs) {
    await prisma.accountTypeConfig.upsert({ where: { type: cfg.type }, update: {}, create: cfg })
  }

  // Default payment gateways (idempotent by name — only inserted when missing).
  const gateways = [
    { name: 'Bank Transfer', type: 'BANK' as const, instructions: 'Transfer to the account shown at checkout. Include your reference.', minAmount: 50, maxAmount: null, sortOrder: 0 },
    { name: 'USDT (TRC20)', type: 'CRYPTO' as const, instructions: 'Send USDT to the wallet address shown at checkout.', minAmount: 50, maxAmount: null, sortOrder: 1 },
    { name: 'Credit / Debit Card', type: 'CARD' as const, instructions: 'Pay securely by card. Processed by our PSP.', minAmount: 50, maxAmount: 10000, sortOrder: 2 },
  ]
  for (const g of gateways) {
    const exists = await prisma.paymentGateway.findFirst({ where: { name: g.name } })
    if (!exists) await prisma.paymentGateway.create({ data: g })
  }

  // Transactional email templates (idempotent by key — edits are preserved).
  const templates = [
    {
      key: 'verify_email',
      name: 'Verify email',
      subject: 'Verify your 27 Markets email',
      body: 'Welcome to 27 Markets.\n\nConfirm your email to activate your account:\n{{link}}\n\nThis link expires in 24 hours.',
    },
    {
      key: 'password_reset',
      name: 'Password reset',
      subject: 'Reset your 27 Markets password',
      body: "We received a request to reset your password.\n\nSet a new password:\n{{link}}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.",
    },
    {
      key: 'welcome',
      name: 'Welcome',
      subject: 'Welcome to 27 Markets',
      body: 'Hi {{firstName}},\n\nYour account is ready. A demo account has been created so you can start trading right away.',
    },
  ]
  for (const tpl of templates) {
    await prisma.notificationTemplate.upsert({ where: { key: tpl.key }, update: {}, create: tpl })
  }

  // Platform settings (idempotent by key — edits are preserved).
  const settings = [
    { key: 'company_name', label: 'Company name', value: '27 Markets Ltd', group: 'General', sortOrder: 0 },
    { key: 'support_email', label: 'Support email', value: 'info@27markets.com', group: 'General', sortOrder: 1 },
    { key: 'support_hours', label: 'Support hours', value: '24/5', group: 'General', sortOrder: 2 },
    { key: 'min_deposit_usd', label: 'Minimum deposit (USD)', value: '50', group: 'Funding', sortOrder: 0 },
    { key: 'default_currency', label: 'Default account currency', value: 'USD', group: 'Funding', sortOrder: 1 },
    { key: 'ib_commission_pct', label: 'IB commission (% of deposits)', value: '10', group: 'Partners', sortOrder: 0 },
    { key: 'maintenance_mode', label: 'Maintenance mode (true/false)', value: 'false', group: 'System', sortOrder: 0 },
    { key: 'maintenance_message', label: 'Maintenance message', value: 'We are performing scheduled maintenance. Please check back soon.', group: 'System', sortOrder: 1 },
  ]
  for (const s of settings) {
    await prisma.appSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }

  // Default trading servers (idempotent by name).
  const servers = [
    { name: '27Markets-Live', host: 'live.mt5.27markets.com', platform: 'MT5', environment: 'LIVE', sortOrder: 0 },
    { name: '27Markets-Demo', host: 'demo.mt5.27markets.com', platform: 'MT5', environment: 'DEMO', sortOrder: 1 },
  ]
  for (const srv of servers) {
    const exists = await prisma.tradingServer.findFirst({ where: { name: srv.name } })
    if (!exists) await prisma.tradingServer.create({ data: srv })
  }

  // Card + e-wallet payment method types (idempotent by category+name).
  const methodTypes = [
    { category: 'CARD', name: 'Visa', sortOrder: 0 },
    { category: 'CARD', name: 'Mastercard', sortOrder: 1 },
    { category: 'CARD', name: 'American Express', sortOrder: 2 },
    { category: 'EWALLET', name: 'Skrill', sortOrder: 0 },
    { category: 'EWALLET', name: 'Neteller', sortOrder: 1 },
    { category: 'EWALLET', name: 'PayPal', sortOrder: 2 },
  ]
  for (const m of methodTypes) {
    const exists = await prisma.paymentMethodType.findFirst({ where: { category: m.category, name: m.name } })
    if (!exists) await prisma.paymentMethodType.create({ data: m })
  }

  // FX reference rates (idempotent by base+quote).
  const rates = [
    { base: 'USD', quote: 'EUR', rate: '0.92' },
    { base: 'USD', quote: 'GBP', rate: '0.79' },
    { base: 'USD', quote: 'AED', rate: '3.67' },
    { base: 'USD', quote: 'INR', rate: '83.20' },
  ]
  for (const r of rates) {
    await prisma.exchangeRate.upsert({ where: { base_quote: { base: r.base, quote: r.quote } }, update: {}, create: r })
  }

  // KYC field definitions (idempotent by kind+label).
  const kycFields = [
    { kind: 'QUESTION', label: 'Are you a politically exposed person (PEP)?', fieldType: 'BOOLEAN', required: true, sortOrder: 0 },
    { kind: 'QUESTION', label: 'Source of funds', fieldType: 'SELECT', required: true, sortOrder: 1 },
    { kind: 'QUESTION', label: 'Expected annual deposit', fieldType: 'SELECT', required: false, sortOrder: 2 },
    { kind: 'EXTENDED', label: 'Tax identification number', fieldType: 'TEXT', required: false, sortOrder: 0 },
    { kind: 'EXTENDED', label: 'Occupation', fieldType: 'TEXT', required: false, sortOrder: 1 },
  ]
  for (const f of kycFields) {
    const exists = await prisma.kycFieldDefinition.findFirst({ where: { kind: f.kind, label: f.label } })
    if (!exists) await prisma.kycFieldDefinition.create({ data: f })
  }

  // KYC forms (idempotent by name).
  const kycForms = [
    { name: 'Individual Onboarding', description: 'Standard KYC for individual retail clients.', sortOrder: 0 },
    { name: 'Corporate Onboarding', description: 'Enhanced due diligence for corporate accounts.', sortOrder: 1 },
  ]
  for (const f of kycForms) {
    const exists = await prisma.kycForm.findFirst({ where: { name: f.name } })
    if (!exists) await prisma.kycForm.create({ data: f })
  }

  // Consents (idempotent by label).
  const consents = [
    { label: 'Terms & Conditions', body: 'I have read and agree to the Client Agreement and Terms & Conditions.', required: true, sortOrder: 0 },
    { label: 'Risk Disclosure', body: 'I acknowledge that I have read and understood the Risk Disclosure.', required: true, sortOrder: 1 },
    { label: 'Marketing communications', body: 'I agree to receive marketing communications from 27 Markets.', required: false, sortOrder: 2 },
  ]
  for (const c of consents) {
    const exists = await prisma.consent.findFirst({ where: { label: c.label } })
    if (!exists) await prisma.consent.create({ data: c })
  }

  // Text templates (idempotent by kind+name).
  const textTemplates = [
    { kind: 'PDF', name: 'Account Statement', body: 'Statement for {{clientName}} — period {{period}}.\nBalance: {{balance}}', sortOrder: 0 },
    { kind: 'PDF', name: 'Deposit Receipt', body: 'Receipt for deposit of {{amount}} by {{clientName}} on {{date}}.', sortOrder: 1 },
    { kind: 'COMMENT', name: 'KYC follow-up', body: 'Hi {{clientName}}, we need an additional document to complete your verification.', sortOrder: 0 },
    { kind: 'COMMENT', name: 'Withdrawal delay', body: 'Your withdrawal is being processed and will be completed within 1-3 business days.', sortOrder: 1 },
  ]
  for (const t of textTemplates) {
    const exists = await prisma.textTemplate.findFirst({ where: { kind: t.kind, name: t.name } })
    if (!exists) await prisma.textTemplate.create({ data: t })
  }

  // Sample campaigns (idempotent by name).
  const campaigns = [
    { name: 'Welcome series', channel: 'EMAIL', audience: 'New clients', subject: 'Welcome to 27 Markets', message: 'Thanks for joining — here is how to get started.', status: 'SENT' },
    { name: 'Q3 promotion', channel: 'EMAIL', audience: 'All clients', subject: 'Trade with tighter spreads', message: 'For a limited time, enjoy reduced spreads on major pairs.', status: 'DRAFT' },
  ]
  for (const c of campaigns) {
    const exists = await prisma.campaign.findFirst({ where: { name: c.name } })
    if (!exists) await prisma.campaign.create({ data: c })
  }

  // IB campaigns (idempotent by code).
  const ibCampaigns = [
    { name: 'Ramadan Promo', code: 'IB-RAMADAN', description: 'Seasonal IB acquisition push.', sortOrder: 0 },
    { name: 'YouTube Partners', code: 'IB-YT', description: 'Tracking for YouTube-referred sign-ups.', sortOrder: 1 },
  ]
  for (const c of ibCampaigns) {
    await prisma.ibCampaign.upsert({ where: { code: c.code }, update: {}, create: c })
  }

  const admin = await upsertUser('admin@27markets.io', 'Admin123!', 'Avery', 'Stone', UserRole.ADMIN)
  const agent = await upsertUser('agent@27markets.io', 'Agent123!', 'Riley', 'Mensah', UserRole.AGENT)
  const client = await upsertUser('client@27markets.io', 'Client123!', 'Jordan', 'Avery', UserRole.CLIENT)

  // Sample pending data-change requests for the demo client.
  if ((await prisma.dataChangeRequest.count({ where: { userId: client.id } })) === 0) {
    await prisma.dataChangeRequest.createMany({
      data: [
        { userId: client.id, field: 'phone', currentValue: '+971 50 000 0000', requestedValue: '+971 55 123 4567' },
        { userId: client.id, field: 'address', currentValue: null, requestedValue: '12 Marina Walk, Dubai' },
      ],
    })
  }

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
        leverage: '1:50',
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

  // ── Rich demo activity for dashboard charts (idempotent) ──
  const DEMO_PREFIX = 'demo.client+'
  if ((await prisma.user.count({ where: { email: { startsWith: DEMO_PREFIX } } })) === 0) {
    const demoHash = await argon2.hash('Client123!', { type: argon2.argon2id })
    const countries = ['United Arab Emirates', 'United Kingdom', 'Germany', 'Singapore', 'India', 'Canada', 'Australia']
    const names: [string, string][] = [['Liam','Nguyen'],['Olivia','Khan'],['Noah','Silva'],['Emma','Costa'],['Ava','Mensah'],['Lucas','Park'],['Mia','Haddad'],['Ethan','Reyes']]
    const leadStatuses = [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CONVERTED, LeadStatus.LOST]
    const daysAgo = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d }

    const clearing = await prisma.ledgerAccount.upsert({
      where: { code: 'SYSTEM:PSP_CLEARING' }, update: {},
      create: { code: 'SYSTEM:PSP_CLEARING', name: 'PSP / Bank Clearing', type: LedgerAccountType.ASSET },
    })
    const payable = await prisma.ledgerAccount.upsert({
      where: { code: 'SYSTEM:WITHDRAWALS_PAYABLE' }, update: {},
      create: { code: 'SYSTEM:WITHDRAWALS_PAYABLE', name: 'Withdrawals Payable', type: LedgerAccountType.LIABILITY },
    })

    for (let i = 0; i < 50; i++) {
      const [first, last] = names[i % names.length]
      const created = daysAgo(88 - Math.floor((i / 50) * 86)) // oldest → newest across ~88 days
      const approved = i % 10 !== 0                            // ~90% fully verified

      const user = await prisma.user.create({
        data: {
          email: `${DEMO_PREFIX}${i}@27markets.io`,
          passwordHash: demoHash,
          firstName: first,
          lastName: `${last}${i}`,
          role: UserRole.CLIENT,
          country: countries[i % countries.length],
          createdAt: created,
          kycProfile: {
            create: approved
              ? { identityStatus: KycStepStatus.APPROVED, addressStatus: KycStepStatus.APPROVED, selfieStatus: KycStepStatus.APPROVED }
              : { identityStatus: KycStepStatus.PENDING },
          },
        },
      })

      const number = `30${100000 + i}`
      const account = await prisma.tradingAccount.create({
        data: { number, userId: user.id, type: AccountType.STANDARD, mode: AccountMode.LIVE, leverage: '1:10', createdAt: created },
      })
      const clientLedger = await prisma.ledgerAccount.create({
        data: { code: `CLIENT:${account.id}`, name: `Client balance ${number}`, type: LedgerAccountType.LIABILITY, userId: user.id, tradingAccountId: account.id },
      })

      const depAmount = new Prisma.Decimal(200 + i * 35)
      await prisma.journalEntry.create({
        data: {
          reference: `TX-DEMO-D${i}`,
          kind: JournalKind.DEPOSIT,
          idempotencyKey: `seed-demo-deposit:${account.id}`,
          simulated: true,
          status: JournalStatus.POSTED,
          memo: 'Seed demo deposit',
          createdAt: created,
          postings: { create: [
            { ledgerAccountId: clearing.id, direction: PostingDirection.DEBIT, amount: depAmount },
            { ledgerAccountId: clientLedger.id, direction: PostingDirection.CREDIT, amount: depAmount },
          ] },
        },
      })

      if (i % 5 === 0) {
        const wdAmount = new Prisma.Decimal(100 + i * 10)
        const wdDate = daysAgo(Math.max(0, 88 - Math.floor((i / 50) * 86) - 3))
        await prisma.journalEntry.create({
          data: {
            reference: `TX-DEMO-W${i}`,
            kind: JournalKind.WITHDRAWAL,
            idempotencyKey: `seed-demo-wd:${account.id}`,
            simulated: true,
            status: i % 10 === 0 ? JournalStatus.PENDING : JournalStatus.POSTED,
            memo: 'Seed demo withdrawal',
            createdAt: wdDate,
            postings: { create: [
              { ledgerAccountId: clientLedger.id, direction: PostingDirection.DEBIT, amount: wdAmount },
              { ledgerAccountId: payable.id, direction: PostingDirection.CREDIT, amount: wdAmount },
            ] },
          },
        })
      }

      if (i % 3 === 0) {
        await prisma.lead.create({
          data: {
            name: `${first} ${last}${i}`,
            email: `demo.lead+${i}@example.com`,
            country: countries[i % countries.length],
            source: LeadSource.REGISTER,
            status: leadStatuses[i % leadStatuses.length],
            createdAt: created,
          },
        })
      }
    }
  }

  // ── Demo partner (IB) with referred clients (idempotent) ──
  const demoPartner = await prisma.user.findUnique({ where: { email: 'partner@27markets.io' } });
  if (!demoPartner) {
    const partner = await prisma.user.create({
      data: {
        email: 'partner@27markets.io',
        passwordHash: await argon2.hash('Partner123!', { type: argon2.argon2id }),
        firstName: 'Sasha', lastName: 'Ibragimov',
        role: UserRole.PARTNER,
        country: 'United Arab Emirates',
        emailVerified: true,
        acceptedTermsAt: new Date(),
        partnerProfile: { create: { referralCode: 'DEMO27IB' } },
      },
    });
    // Attribute ~18 existing demo clients to this partner (spread across signups).
    const demoClients = await prisma.user.findMany({
      where: { email: { startsWith: 'demo.client+' } },
      orderBy: { createdAt: 'asc' },
      take: 18,
      select: { id: true },
    });
    for (const c of demoClients) {
      await prisma.user.update({ where: { id: c.id }, data: { referredByPartnerId: partner.id } });
    }
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
