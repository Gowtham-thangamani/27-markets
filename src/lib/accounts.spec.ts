import { describe, expect, it } from 'vitest'
import { preferredAccountId, transactionsForAccount } from './accounts'

const acc = (id: string) => ({ id })

describe('preferredAccountId', () => {
  it('uses the globally selected account when the page can act on it', () => {
    expect(preferredAccountId([acc('a'), acc('b')], 'b')).toBe('b')
  })

  it('falls back to the first eligible account when the selection is not eligible', () => {
    // Trade only lists demo accounts; a client with a live account selected
    // must still get a usable form rather than an empty one.
    expect(preferredAccountId([acc('a'), acc('b')], 'live-1')).toBe('a')
  })

  it('falls back when nothing is selected yet', () => {
    expect(preferredAccountId([acc('a')], null)).toBe('a')
  })

  it('returns empty string when there is nothing to pick', () => {
    expect(preferredAccountId([], 'a')).toBe('')
  })
})

describe('transactionsForAccount', () => {
  const rows = [
    { id: '1', accountId: 'a' },
    { id: '2', accountId: 'b' },
    { id: '3', accountId: null },
  ]

  it('keeps only the selected account’s rows', () => {
    expect(transactionsForAccount(rows, 'a').map((r) => r.id)).toEqual(['1', '3'])
  })

  it('keeps unattributed rows so nothing silently disappears', () => {
    expect(transactionsForAccount(rows, 'b').map((r) => r.id)).toEqual(['2', '3'])
  })

  it('passes everything through when no account is selected', () => {
    expect(transactionsForAccount(rows, null)).toHaveLength(3)
  })

  it('passes everything through when the API attributes nothing', () => {
    // An API older than the per-account history change returns no accountId at
    // all. Filtering on it would empty the client's history entirely.
    const legacy: { id: string; accountId?: string | null }[] = [{ id: '1' }, { id: '2' }]
    expect(transactionsForAccount(legacy, 'a')).toHaveLength(2)
  })
})
