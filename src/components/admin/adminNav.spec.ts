import { describe, expect, it } from 'vitest'
import { adminNav, isGroup, type AdminNavLink } from './adminNav'

const links = (): AdminNavLink[] => adminNav.flatMap((e) => (isGroup(e) ? e.children : [e]))
const labels = () => links().map((l) => l.label)
const paths = () => links().map((l) => l.to)
const groupFor = (label: string) =>
  adminNav.find((e) => isGroup(e) && e.children.some((c) => c.label === label))

describe('admin navigation — nothing appears twice', () => {
  it('has no duplicate link labels', () => {
    // Two entries called "Templates" (notification vs document) sent staff to
    // the wrong page. Any repeat here is the same class of problem.
    const seen = labels()
    expect(new Set(seen).size).toBe(seen.length)
  })

  it('has no duplicate destinations', () => {
    const seen = paths()
    expect(new Set(seen).size).toBe(seen.length)
  })

  it('has no duplicate group labels', () => {
    const groups = adminNav.filter(isGroup).map((g) => g.label)
    expect(new Set(groups).size).toBe(groups.length)
  })
})

describe('admin navigation — merged entries', () => {
  it('drops Transactions, whose job the Deposit and Withdrawal pages already do', () => {
    expect(labels()).not.toContain('Transactions')
    expect(paths()).toContain('/admin/deposit-requests')
    expect(paths()).toContain('/admin/withdrawal-requests')
  })

  it.each([
    ['KYC Questions', 'Extended Fields'],
    ['Credit Card Types', 'E-Wallet Types'],
    ['PDF Templates', 'Comment Templates'],
    ['User Referrals', 'Referrals'],
  ])('no longer lists %s and %s as separate rows', (a) => {
    expect(labels()).not.toContain(a)
  })

  it('keeps the review queue and the document inventory as separate pages', () => {
    // These look like duplicates by name but are not: /admin/kyc is the
    // approve/reject queue, /admin/document-tracker is a read-only list of
    // uploaded files with no status column and no actions. Merging them would
    // have removed the only route to KYC approval.
    expect(labels()).not.toContain('Pending Documents') // renamed, not removed
    expect(labels()).toContain('KYC Review')
    expect(paths()).toContain('/admin/kyc')
    expect(paths()).toContain('/admin/document-tracker')
  })
})

describe('admin navigation — clearer names and placement', () => {
  it('renames the per-client KYC view so it is not confused with form definitions', () => {
    expect(labels()).not.toContain('Users KYC Forms')
    expect(labels()).toContain('Client KYC Status')
    expect(labels()).toContain('KYC Forms') // the definitions page keeps its name
  })

  it('names the notification templates explicitly', () => {
    expect(labels()).toContain('Notification Templates')
  })

  it('files Dormant Accounts under Trading, with the other account pages', () => {
    const group = groupFor('Dormant Accounts')
    expect(group && isGroup(group) ? group.label : undefined).toBe('Trading')
  })
})
