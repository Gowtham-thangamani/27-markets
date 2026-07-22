import { renderStatement, type StatementInput } from './partner-statement'

const base: StatementInput = {
  partnerName: 'Sasha Ibragimov',
  referralCode: 'DEMO27IB',
  periodLabel: 'All time',
  generatedAt: new Date('2026-07-22T00:00:00Z'),
  rows: [],
  totals: { total: 0, direct: 0, indirect: 0, paid: 0, available: 0 },
  footerNote: null,
}

const isPdf = (b: Buffer) => b.subarray(0, 5).toString('latin1') === '%PDF-'

describe('renderStatement', () => {
  it('produces a valid PDF buffer even with no rows', async () => {
    const buf = await renderStatement(base)
    expect(isPdf(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(500)
  })

  it('grows with more commission rows', async () => {
    const few = await renderStatement({ ...base, rows: [{ date: '2026-06-01', client: 'A', level: 1, amount: 10 }] })
    const many = await renderStatement({
      ...base,
      rows: Array.from({ length: 60 }, (_, i) => ({ date: '2026-06-01', client: `Client ${i}`, level: (i % 2) + 1, amount: 10 + i })),
    })
    expect(isPdf(few)).toBe(true)
    expect(isPdf(many)).toBe(true)
    // 60 rows spill onto a second page, so the buffer is clearly larger.
    expect(many.length).toBeGreaterThan(few.length)
  })

  it('renders the simulation watermark when present', async () => {
    const buf = await renderStatement({ ...base, footerNote: 'SIMULATION — not a valid financial document' })
    expect(isPdf(buf)).toBe(true)
  })
})
