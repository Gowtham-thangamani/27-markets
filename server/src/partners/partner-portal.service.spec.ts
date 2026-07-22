import { NotFoundException } from '@nestjs/common'
import { PartnerPortalService } from './partner-portal.service'

function clientRow(i: number, kyc: Partial<Record<'identityStatus'|'addressStatus'|'selfieStatus', string>> | null, daysAgo: number) {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - daysAgo)
  return { id: `c${i}`, firstName: 'Cli', lastName: `Ent${i}`, email: `c${i}@x.io`, country: 'UK', createdAt: d,
    kycProfile: kyc ? { identityStatus: kyc.identityStatus ?? 'NOT_SUBMITTED', addressStatus: kyc.addressStatus ?? 'NOT_SUBMITTED', selfieStatus: kyc.selfieStatus ?? 'NOT_SUBMITTED' } : null }
}

function makeService(rows: any[], profile: any = { referralCode: 'ABC12345' }, origin = 'https://app.example') {
  const prisma = {
    user: { findMany: jest.fn().mockResolvedValue(rows) },
    partnerProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
  } as any
  const config = { get: jest.fn().mockReturnValue(origin) } as any
  return new PartnerPortalService(prisma, config)
}

describe('PartnerPortalService.dashboard', () => {
  it('aggregates only the caller\'s referred clients', async () => {
    const rows = [
      clientRow(1, { identityStatus:'APPROVED', addressStatus:'APPROVED', selfieStatus:'APPROVED' }, 2),
      clientRow(2, { identityStatus:'PENDING' }, 5),
      clientRow(3, null, 40),
    ]
    const svc = makeService(rows)
    const r = await svc.dashboard('p1')
    expect(r.referralCode).toBe('ABC12345')
    expect(r.kpis.totalReferred.value).toBe(3)
    expect(r.kpis.kycVerified.value).toBe(1)
    expect(r.series).toHaveLength(90)
    expect(r.kycDistribution.APPROVED).toBe(1)
    expect(r.kycDistribution.PENDING).toBe(1)
    expect(r.kycDistribution.NOT_SUBMITTED).toBe(1)
    expect(r.recentReferrals[0].id).toBe('c1') // newest first
    // queried scoped to the partner:
    expect((svc as any).prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { referredByPartnerId: 'p1' } }))
  })

  it('throws 404 when the partner has no profile', async () => {
    const svc = makeService([], null)
    await expect(svc.dashboard('p1')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('PartnerPortalService.commissions', () => {
  const svcWith = (commissions: any[], profile: any = { referralCode: 'ABC' }) => {
    const prisma = {
      partnerProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
      ibCommission: { findMany: jest.fn().mockResolvedValue(commissions) },
      appSetting: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([
        { id: 'c1', firstName: 'Ada', lastName: 'Lovelace' },
        { id: 'c2', firstName: 'Bob', lastName: 'Smith' },
      ]) },
    } as any
    return new PartnerPortalService(prisma, { get: jest.fn() } as any)
  }

  it('returns the caller\'s commissions with a total and client names', async () => {
    const svc = svcWith([
      { id: 'k1', partnerId: 'p1', clientId: 'c1', amount: 100, source: 'deposit', reference: 'TX-1', createdAt: new Date() },
      { id: 'k2', partnerId: 'p1', clientId: 'c2', amount: 50, source: 'deposit', reference: 'TX-2', createdAt: new Date() },
    ])
    const r = await svc.commissions('p1')
    expect(r.total).toBe(150)
    expect(r.count).toBe(2)
    expect(r.rows[0]).toMatchObject({ amount: 100, source: 'deposit', client: 'Ada Lovelace' })
    expect((svc as any).prisma.ibCommission.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { partnerId: 'p1' } }))
  })

  it('returns an empty total when there are no commissions', async () => {
    const svc = svcWith([])
    const r = await svc.commissions('p1')
    expect(r).toMatchObject({ total: 0, count: 0, rows: [] })
  })

  it('throws 404 when the partner has no profile', async () => {
    const svc = svcWith([], null)
    await expect(svc.commissions('p1')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('PartnerPortalService.requestPayout', () => {
  // Models the race-safe flow: create shell → claim unreserved rows → sum what
  // was actually reserved → set the amount.
  const svcWith = (commissions: any[], profile: any = { referralCode: 'ABC', payoutMethod: 'BANK' }) => {
    const available = commissions.filter((c) => !c.payoutId)
    const reservedSum = available.reduce((s, c) => s + Number(c.amount), 0)
    const tx = {
      ibCommission: {
        updateMany: jest.fn().mockResolvedValue({ count: available.length }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: reservedSum } }),
      },
      partnerPayout: {
        create: jest.fn().mockImplementation(({ data }: any) => ({ id: 'po1', reference: data.reference, amount: data.amount, status: 'PENDING' })),
        update: jest.fn().mockImplementation(({ data }: any) => ({ id: 'po1', reference: 'TX-REF', amount: data.amount, status: 'PENDING' })),
      },
    }
    const prisma = {
      partnerProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
    } as any
    return { svc: new PartnerPortalService(prisma, { get: jest.fn() } as any), tx }
  }

  it('reserves unreserved commission atomically (payoutId:null) and sets the summed amount', async () => {
    const { svc, tx } = svcWith([
      { id: 'k1', amount: 100, payoutId: null },
      { id: 'k2', amount: 50, payoutId: null },
      { id: 'k3', amount: 30, payoutId: 'old' },
    ])
    const r = await svc.requestPayout('p1')
    expect(r).toMatchObject({ amount: 150, status: 'PENDING' })
    // The claim filters on payoutId:null (the atomic guard), NOT a pre-read id list.
    expect(tx.ibCommission.updateMany).toHaveBeenCalledWith({ where: { partnerId: 'p1', payoutId: null }, data: { payoutId: 'po1' } })
    // Amount is the sum of what THIS payout actually captured.
    expect(tx.partnerPayout.update).toHaveBeenCalledWith(expect.objectContaining({ data: { amount: '150.00' } }))
  })

  it('rejects (rolling back the shell payout) when nothing was reservable', async () => {
    const { svc, tx } = svcWith([{ id: 'k1', amount: 30, payoutId: 'old' }])
    await expect(svc.requestPayout('p1')).rejects.toThrow(/no commission/i)
    expect(tx.partnerPayout.update).not.toHaveBeenCalled()
  })

  it('throws 404 when the partner has no profile', async () => {
    const { svc } = svcWith([], null)
    await expect(svc.requestPayout('p1')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('PartnerPortalService.profile', () => {
  it('returns the referral link from CLIENT_ORIGIN + code', async () => {
    const svc = makeService([], { referralCode: 'CODE9999' })
    const p = await svc.profile('p1')
    expect(p).toEqual({
      referralCode: 'CODE9999',
      referralLink: 'https://app.example/register?ref=CODE9999',
      partnerLink: 'https://app.example/partner/apply?ref=CODE9999',
    })
  })

  it('uses only the first origin when CLIENT_ORIGIN is a comma-separated allow-list', async () => {
    const svc = makeService([], { referralCode: 'CODE9999' }, 'https://27markets.com,https://www.27markets.com')
    const p = await svc.profile('p1')
    expect(p.referralLink).toBe('https://27markets.com/register?ref=CODE9999')
  })
})

describe('PartnerPortalService.clients', () => {
  const client = (over: any = {}) => ({
    id: 'c1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.io', country: 'UK',
    createdAt: new Date('2026-01-01T00:00:00Z'), kycProfile: null, phone: '+971500000000',
    status: 'ACTIVE', tradingAccounts: [{ type: 'STANDARD', mode: 'LIVE', status: 'ACTIVE' }],
    conversionStatus: 'NO_ANSWER', convertedAt: null, campaignCode: null, assignedAgent: null,
    ...over,
  })

  const svcWith = (rows: any[], ledger: any[] = [], postings: any[] = [], audits: any[] = []) => {
    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue(rows) },
      ledgerAccount: { findMany: jest.fn().mockResolvedValue(ledger) },
      posting: { groupBy: jest.fn().mockResolvedValue(postings) },
      auditLog: { groupBy: jest.fn().mockResolvedValue(audits) },
    } as any
    return new PartnerPortalService(prisma, { get: jest.fn() } as any)
  }

  it('sums deposits across every ledger account a client owns', async () => {
    const svc = svcWith(
      [client()],
      [{ id: 'la1', userId: 'c1' }, { id: 'la2', userId: 'c1' }],
      [{ ledgerAccountId: 'la1', _sum: { amount: 500 } }, { ledgerAccountId: 'la2', _sum: { amount: 295 } }],
    )

    const [row] = await svc.clients('p1')

    expect(row.totalDeposits).toBe(795)
    expect(row.phone).toBe('+971500000000')
    expect(row.accounts).toEqual([{ type: 'STANDARD', mode: 'LIVE', status: 'ACTIVE' }])
  })

  it('reports zero deposits rather than null when a client has never funded', async () => {
    const svc = svcWith([client()], [{ id: 'la1', userId: 'c1' }], [])
    const [row] = await svc.clients('p1')
    expect(row.totalDeposits).toBe(0)
  })

  it('surfaces the latest sign-in, or null when the client never logged in', async () => {
    const when = new Date('2026-07-01T10:00:00Z')
    const withLogin = svcWith([client()], [], [], [{ userId: 'c1', _max: { createdAt: when } }])
    expect((await withLogin.clients('p1'))[0].lastLoginAt).toBe(when.toISOString())

    const never = svcWith([client()], [], [], [])
    expect((await never.clients('p1'))[0].lastLoginAt).toBeNull()
  })

  describe('canTrade', () => {
    const canTradeOf = async (over: any) => (await svcWith([client(over)]).clients('p1'))[0].canTrade

    it('is true for an active user with an active live account', async () => {
      expect(await canTradeOf({})).toBe(true)
    })

    it('is false when the user is suspended, even with a good account', async () => {
      expect(await canTradeOf({ status: 'SUSPENDED' })).toBe(false)
    })

    it('is false when the only live account is not active', async () => {
      expect(await canTradeOf({ tradingAccounts: [{ type: 'STANDARD', mode: 'LIVE', status: 'SUSPENDED' }] })).toBe(false)
    })

    it('is false when the client holds demo accounts only', async () => {
      expect(await canTradeOf({ tradingAccounts: [{ type: 'STANDARD', mode: 'DEMO', status: 'ACTIVE' }] })).toBe(false)
    })

    it('is false when the client has no accounts at all', async () => {
      expect(await canTradeOf({ tradingAccounts: [] })).toBe(false)
    })
  })

  it('skips the aggregate queries entirely when the partner has no clients', async () => {
    const svc = svcWith([])
    const rows = await svc.clients('p1')
    expect(rows).toEqual([])
    expect((svc as any).prisma.posting.groupBy).not.toHaveBeenCalled()
    expect((svc as any).prisma.auditLog.groupBy).not.toHaveBeenCalled()
  })
})

describe('PartnerPortalService CRM fields on the clients list', () => {
  const svcWith = (row: any) => {
    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue([row]) },
      ledgerAccount: { findMany: jest.fn().mockResolvedValue([]) },
      posting: { groupBy: jest.fn().mockResolvedValue([]) },
      auditLog: { groupBy: jest.fn().mockResolvedValue([]) },
    } as any
    return new PartnerPortalService(prisma, { get: jest.fn() } as any)
  }
  const base = {
    id: 'c1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.io', country: 'UK',
    createdAt: new Date('2026-01-01T00:00:00Z'), kycProfile: null, phone: null,
    status: 'ACTIVE', tradingAccounts: [],
  }

  it('maps campaign, conversion status, converted date and sales agent', async () => {
    const svc = svcWith({
      ...base, campaignCode: '1341', conversionStatus: 'CONVERTED',
      convertedAt: new Date('2026-03-02T00:00:00Z'),
      assignedAgent: { firstName: 'Sam', lastName: 'Agent' },
    })
    const [row] = await svc.clients('p1')
    expect(row.campaign).toBe('1341')
    expect(row.conversionStatus).toBe('CONVERTED')
    expect(row.convertedAt).toBe('2026-03-02T00:00:00.000Z')
    expect(row.salesAgent).toBe('Sam Agent')
  })

  it('leaves optional CRM fields null when unset', async () => {
    const svc = svcWith({ ...base, campaignCode: null, conversionStatus: 'NO_ANSWER', convertedAt: null, assignedAgent: null })
    const [row] = await svc.clients('p1')
    expect(row.campaign).toBeNull()
    expect(row.convertedAt).toBeNull()
    expect(row.salesAgent).toBeNull()
  })
})

describe('PartnerPortalService.setConversionStatus', () => {
  const svcWith = (found: any) => {
    const update = jest.fn().mockResolvedValue({})
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(found), update },
    } as any
    return { svc: new PartnerPortalService(prisma, { get: jest.fn() } as any), update, prisma }
  }

  it('only updates a client the partner actually referred', async () => {
    const { svc, prisma } = svcWith({ id: 'c1', convertedAt: null })
    await svc.setConversionStatus('p1', 'c1', 'ON_BOARDING')
    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'c1', referredByPartnerId: 'p1' },
    }))
  })

  it('rejects a client that is not in the partner\'s downline', async () => {
    const { svc } = svcWith(null)
    await expect(svc.setConversionStatus('p1', 'other', 'CONVERTED')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('stamps convertedAt the first time status reaches CONVERTED', async () => {
    const { svc, update } = svcWith({ id: 'c1', convertedAt: null })
    await svc.setConversionStatus('p1', 'c1', 'CONVERTED')
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ conversionStatus: 'CONVERTED', convertedAt: expect.any(Date) }),
    }))
  })

  it('does not overwrite an existing convertedAt', async () => {
    const { svc, update } = svcWith({ id: 'c1', convertedAt: new Date('2026-01-01T00:00:00Z') })
    await svc.setConversionStatus('p1', 'c1', 'CONVERTED')
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: { conversionStatus: 'CONVERTED' },
    }))
  })
})

describe('PartnerPortalService.subPartners', () => {
  it('credits each sub-partner with the indirect commission their clients generated', async () => {
    const prisma = {
      partnerProfile: {
        findMany: jest.fn().mockResolvedValue([
          { referralCode: 'SUB1', createdAt: new Date('2026-02-01T00:00:00Z'),
            user: { id: 'sub1', firstName: 'Sub', lastName: 'One', email: 'sub1@x.io', country: 'AE' } },
        ]),
      },
      user: {
        groupBy: jest.fn().mockResolvedValue([{ referredByPartnerId: 'sub1', _count: { _all: 3 } }]),
        findMany: jest.fn().mockResolvedValue([
          { id: 'cl1', referredByPartnerId: 'sub1' },
          { id: 'cl2', referredByPartnerId: 'sub1' },
        ]),
      },
      ibCommission: {
        findMany: jest.fn().mockResolvedValue([
          { amount: 30, clientId: 'cl1' },
          { amount: 20, clientId: 'cl2' },
        ]),
      },
    } as any
    const svc = new PartnerPortalService(prisma, { get: jest.fn() } as any)

    const [row] = await svc.subPartners('p1')
    expect(row).toMatchObject({ id: 'sub1', referralCode: 'SUB1', clients: 3, commissionEarned: 50 })
    // Only this partner's indirect rows count.
    expect(prisma.ibCommission.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { partnerId: 'p1', level: { gt: 1 } },
    }))
  })

  it('returns an empty list when the partner has no sub-partners', async () => {
    const prisma = { partnerProfile: { findMany: jest.fn().mockResolvedValue([]) } } as any
    const svc = new PartnerPortalService(prisma, { get: jest.fn() } as any)
    expect(await svc.subPartners('p1')).toEqual([])
  })
})

describe('PartnerPortalService.payouts', () => {
  it('lists the partner\'s payouts newest-first with commission counts', async () => {
    const prisma = {
      partnerPayout: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'po1', reference: 'TX-1', amount: 150, status: 'PENDING',
            createdAt: new Date('2026-07-01T00:00:00Z'), reviewedAt: null, _count: { commissions: 2 } },
        ]),
      },
    } as any
    const svc = new PartnerPortalService(prisma, { get: jest.fn() } as any)
    const [row] = await svc.payouts('p1')
    expect(row).toMatchObject({ reference: 'TX-1', amount: 150, status: 'PENDING', commissionCount: 2, reviewedAt: null })
    expect(prisma.partnerPayout.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { partnerId: 'p1' } }))
  })
})

describe('PartnerPortalService payout method + settings', () => {
  const make = (profile: any) => {
    const update = jest.fn().mockResolvedValue({})
    const prisma = {
      partnerProfile: { findUnique: jest.fn().mockResolvedValue(profile), update },
      appSetting: { findMany: jest.fn().mockResolvedValue([
        { key: 'ib_commission_pct', value: '10' }, { key: 'ib_commission_pct_l2', value: '3' },
      ]) },
    } as any
    return { svc: new PartnerPortalService(prisma, { get: jest.fn() } as any), update, prisma }
  }

  it('returns payout method + rates in settings', async () => {
    const { svc } = make({ payoutMethod: 'BANK', payoutDetails: { iban: 'AE...' } })
    const s = await svc.settings('p1')
    expect(s).toEqual({ payoutMethod: 'BANK', payoutDetails: { iban: 'AE...' }, rates: { direct: 10, indirect: 3 } })
  })

  it('whitelists bank fields and trims/bounds values', async () => {
    const { svc, update } = make({ id: 'pp1' })
    await svc.updatePayoutMethod('p1', 'BANK' as any, { accountName: '  Ada  ', iban: 'AE123', evil: 'x', network: 'ignored' } as any)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: { payoutMethod: 'BANK', payoutDetails: { accountName: 'Ada', iban: 'AE123' } },
    }))
  })

  it('rejects an update with no usable details', async () => {
    const { svc } = make({ id: 'pp1' })
    await expect(svc.updatePayoutMethod('p1', 'CRYPTO' as any, { iban: 'wrong-method-field' } as any))
      .rejects.toThrow(/payout details/i)
  })

  it('blocks a payout request when no method is set', async () => {
    const { svc } = make({ payoutMethod: null })
    await expect(svc.requestPayout('p1')).rejects.toThrow(/payout method/i)
  })
})

describe('PartnerPortalService.commissions date range', () => {
  const make = () => {
    const findMany = jest.fn().mockResolvedValue([])
    const prisma = {
      partnerProfile: { findUnique: jest.fn().mockResolvedValue({ referralCode: 'X' }) },
      ibCommission: { findMany },
      appSetting: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    } as any
    return { svc: new PartnerPortalService(prisma, { get: jest.fn() } as any), findMany }
  }

  it('applies an inclusive from/to createdAt filter', async () => {
    const { svc, findMany } = make()
    await svc.commissions('p1', { from: '2026-06-01', to: '2026-06-30' })
    const where = findMany.mock.calls[0][0].where
    expect(where.createdAt.gte).toEqual(new Date('2026-06-01'))
    expect(where.createdAt.lte.getTime()).toBe(new Date('2026-06-30').getTime() + 86400000 - 1)
  })

  it('omits the date filter entirely when no range is given', async () => {
    const { svc, findMany } = make()
    await svc.commissions('p1')
    expect(findMany.mock.calls[0][0].where).toEqual({ partnerId: 'p1' })
  })
})

describe('PartnerPortalService.clientDetail', () => {
  const make = (found: any, deposits: any[] = [], commissions: any[] = []) => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(found) },
      posting: { findMany: jest.fn().mockResolvedValue(deposits) },
      ibCommission: { findMany: jest.fn().mockResolvedValue(commissions) },
      auditLog: { groupBy: jest.fn().mockResolvedValue([]) },
    } as any
    return { svc: new PartnerPortalService(prisma, { get: jest.fn() } as any), prisma }
  }
  const client = {
    id: 'c1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.io', country: 'UK',
    createdAt: new Date('2026-01-01T00:00:00Z'), kycProfile: null, phone: '+9715',
    status: 'ACTIVE', tradingAccounts: [], conversionStatus: 'CONVERTED', convertedAt: null,
    campaignCode: 'ig', assignedAgent: null, ledgerAccounts: [{ id: 'la1' }],
  }

  it('returns profile, deposits and commission scoped to the partner', async () => {
    const { svc, prisma } = make(
      client,
      [{ amount: 500, createdAt: new Date('2026-02-01T00:00:00Z'), journalEntry: { reference: 'TX-1' } }],
      [{ amount: 50, level: 1, createdAt: new Date('2026-02-01T00:00:00Z'), payoutId: null, payout: null }],
    )
    const d = await svc.clientDetail('p1', 'c1')
    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'c1', referredByPartnerId: 'p1' },
    }))
    expect(d.totalDeposits).toBe(500)
    expect(d.deposits[0]).toEqual({ amount: 500, reference: 'TX-1', date: '2026-02-01T00:00:00.000Z' })
    expect(d.commissions[0]).toMatchObject({ amount: 50, level: 1, status: 'AVAILABLE' })
  })

  it('404s for a client the partner did not refer', async () => {
    const { svc } = make(null)
    await expect(svc.clientDetail('p1', 'x')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('PartnerPortalService.subPartnerClients', () => {
  it('lists a downline sub-partner\'s clients, doubly scoped', async () => {
    const prisma = {
      partnerProfile: { findFirst: jest.fn().mockResolvedValue({ user: { id: 'sub1', firstName: 'Sub', lastName: 'One' } }) },
      user: { findMany: jest.fn().mockResolvedValue([
        { id: 'cc1', firstName: 'Cl', lastName: 'Ient', email: 'c@x.io', country: 'AE', createdAt: new Date(), kycProfile: null },
      ]) },
    } as any
    const svc = new PartnerPortalService(prisma, { get: jest.fn() } as any)
    const r = await svc.subPartnerClients('p1', 'sub1')
    expect(prisma.partnerProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'sub1', parentPartnerId: 'p1' },
    }))
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { referredByPartnerId: 'sub1' } }))
    expect(r.subPartner.name).toBe('Sub One')
    expect(r.clients).toHaveLength(1)
  })

  it('404s when the sub-partner is not in the caller\'s downline', async () => {
    const prisma = { partnerProfile: { findFirst: jest.fn().mockResolvedValue(null) } } as any
    const svc = new PartnerPortalService(prisma, { get: jest.fn() } as any)
    await expect(svc.subPartnerClients('p1', 'other')).rejects.toBeInstanceOf(NotFoundException)
  })
})
