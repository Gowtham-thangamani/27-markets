import { NotFoundException } from '@nestjs/common'
import { PartnerPortalService } from './partner-portal.service'

function clientRow(i: number, kyc: Partial<Record<'identityStatus'|'addressStatus'|'selfieStatus', string>> | null, daysAgo: number) {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - daysAgo)
  return { id: `c${i}`, firstName: 'Cli', lastName: `Ent${i}`, email: `c${i}@x.io`, country: 'UK', createdAt: d,
    kycProfile: kyc ? { identityStatus: kyc.identityStatus ?? 'NOT_SUBMITTED', addressStatus: kyc.addressStatus ?? 'NOT_SUBMITTED', selfieStatus: kyc.selfieStatus ?? 'NOT_SUBMITTED' } : null }
}

function makeService(rows: any[], profile: any = { referralCode: 'ABC12345' }) {
  const prisma = {
    user: { findMany: jest.fn().mockResolvedValue(rows) },
    partnerProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
  } as any
  const config = { get: jest.fn().mockReturnValue('https://app.example') } as any
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

describe('PartnerPortalService.profile', () => {
  it('returns the referral link from CLIENT_ORIGIN + code', async () => {
    const svc = makeService([], { referralCode: 'CODE9999' })
    const p = await svc.profile('p1')
    expect(p).toEqual({ referralCode: 'CODE9999', referralLink: 'https://app.example/register?ref=CODE9999' })
  })
})
