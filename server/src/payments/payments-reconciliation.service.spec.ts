import { PaymentsReconciliationService } from './payments-reconciliation.service'

const HOUR = 60 * 60 * 1000

// A settled PSP deposit older than the webhook grace period.
const pspDeposit = (id: string, amountMinor: number, ageMs = HOUR) => ({
  id,
  amountMinor,
  created: Math.floor((Date.now() - ageMs) / 1000),
})

// A POSTED stripe-keyed ledger entry with one client CREDIT posting (major units).
const ledgerEntry = (sessionId: string, amountMajor: number, ageMs = HOUR) => ({
  idempotencyKey: `stripe:${sessionId}`,
  reference: `TX-${sessionId}`,
  createdAt: new Date(Date.now() - ageMs),
  postings: [
    { direction: 'DEBIT', amount: amountMajor },
    { direction: 'CREDIT', amount: amountMajor },
  ],
})

const make = (deposits: any[] | null, entries: any[]) => {
  const auditor = { record: jest.fn() }
  const prisma = { journalEntry: { findMany: jest.fn().mockResolvedValue(entries) } } as any
  const payments = deposits === null
    ? { name: 'simulation', simulated: true } // no listCompletedDeposits → no-op
    : { name: 'stripe', simulated: false, listCompletedDeposits: jest.fn().mockResolvedValue(deposits) }
  const svc = new PaymentsReconciliationService(prisma, auditor as any, payments as any)
  return { svc, auditor, payments }
}

describe('PaymentsReconciliationService', () => {
  it('is a no-op when the provider has no queryable backend (simulation)', async () => {
    const { svc } = make(null, [])
    expect(await svc.reconcile()).toBeNull()
  })

  it('reports in-sync when every settled deposit matches a ledger credit', async () => {
    const { svc, auditor } = make(
      [pspDeposit('s1', 10000)],
      [ledgerEntry('s1', 100)],
    )
    const r = await svc.reconcile()
    expect(r).toMatchObject({ inSync: true, missingLedger: [], amountMismatch: [], unmatchedLedger: [] })
    expect(auditor.record).not.toHaveBeenCalled()
  })

  it('flags a deposit paid at the PSP with no ledger credit (money received, not credited)', async () => {
    const { svc, auditor } = make([pspDeposit('s1', 10000)], [])
    const r = await svc.reconcile()
    expect(r?.missingLedger).toEqual([{ id: 's1', amountMinor: 10000 }])
    expect(r?.inSync).toBe(false)
    expect(auditor.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'psp.reconcile.drift' }))
  })

  it('flags an amount mismatch between the PSP and the ledger', async () => {
    const { svc } = make(
      [pspDeposit('s1', 10000)], // Stripe settled $100.00
      [ledgerEntry('s1', 99)],   // ledger credited $99.00
    )
    const r = await svc.reconcile()
    expect(r?.amountMismatch).toEqual([{ id: 's1', pspMinor: 10000, ledgerMinor: 9900 }])
  })

  it('flags a stripe-keyed ledger credit with no settled PSP deposit', async () => {
    const { svc } = make([], [ledgerEntry('ghost', 100)])
    const r = await svc.reconcile()
    expect(r?.unmatchedLedger).toEqual([{ idempotencyKey: 'stripe:ghost', reference: 'TX-ghost' }])
  })

  it('gives a just-paid deposit webhook grace instead of flagging it', async () => {
    const { svc } = make([pspDeposit('fresh', 10000, 60 * 1000)], []) // paid 1 min ago
    const r = await svc.reconcile()
    expect(r?.missingLedger).toEqual([])
    expect(r?.inSync).toBe(true)
  })
})
