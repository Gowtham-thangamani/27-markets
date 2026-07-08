import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listReferrals: vi.fn().mockResolvedValue([
      { id: 'u1', referred: { id: 'u1', name: 'Ada Lovelace', email: 'ada@x.com' }, referrer: { id: 'p1', name: 'Sasha Ibragimov', email: 'ib@x.com' }, joinedAt: '2026-06-01T00:00:00.000Z' },
    ]),
  },
}))

import AdminReferralsPage from './AdminReferralsPage'

describe('AdminReferralsPage', () => {
  it('lists referred clients with their referrer', async () => {
    render(<AdminReferralsPage />)
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument())
    expect(screen.getByText('Sasha Ibragimov')).toBeInTheDocument()
  })
})
