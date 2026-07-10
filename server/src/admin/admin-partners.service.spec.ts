import { AdminPartnersService } from './admin-partners.service'

const audit = () => ({ record: jest.fn() })

describe('AdminPartnersService — partner payouts', () => {
  it('lists pending payouts enriched with partner info', async () => {
    const prisma = {
      partnerPayout: { findMany: jest.fn().mockResolvedValue([{ id: 'po1', partnerId: 'p1', amount: 150, status: 'PENDING', reference: 'TX-1', createdAt: new Date() }]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', firstName: 'Sasha', lastName: 'Ib', email: 's@ib.io' }]) },
    } as any
    const svc = new AdminPartnersService(prisma, audit() as any)
    const r = await svc.listPartnerPayouts()
    expect(r[0]).toMatchObject({ id: 'po1', amount: 150, status: 'PENDING', partner: { name: 'Sasha Ib', email: 's@ib.io' } })
    expect(prisma.partnerPayout.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PENDING' } }))
  })

  it('approves a pending payout via an atomic claim (PENDING -> PAID)', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 })
    const svc = new AdminPartnersService({ partnerPayout: { updateMany } } as any, audit() as any)
    const r = await svc.approvePartnerPayout('admin1', 'po1')
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'po1', status: 'PENDING' }, data: expect.objectContaining({ status: 'PAID' }) }))
    expect(r).toMatchObject({ ok: true, status: 'PAID' })
  })

  it('refuses to approve a payout that is not pending', async () => {
    const svc = new AdminPartnersService({ partnerPayout: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } } as any, audit() as any)
    await expect(svc.approvePartnerPayout('admin1', 'po1')).rejects.toThrow(/not pending/i)
  })

  it('rejecting a payout releases its reserved commissions back to available', async () => {
    const tx = {
      partnerPayout: { update: jest.fn().mockResolvedValue({}) },
      ibCommission: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    }
    const prisma = {
      partnerPayout: { findUnique: jest.fn().mockResolvedValue({ id: 'po1', status: 'PENDING' }) },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
    } as any
    const svc = new AdminPartnersService(prisma, audit() as any)
    const r = await svc.rejectPartnerPayout('admin1', 'po1')
    expect(tx.ibCommission.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { payoutId: 'po1' }, data: { payoutId: null } }))
    expect(r).toMatchObject({ ok: true, status: 'REJECTED' })
  })
})
