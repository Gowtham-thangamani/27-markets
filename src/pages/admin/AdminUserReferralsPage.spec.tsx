import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    referralSummary: vi.fn().mockResolvedValue([
      { id: 'p1', name: 'Sasha Ibragimov', email: 'ib@x.com', referralCount: 18 },
      { id: 'p2', name: 'Alex Partner', email: 'ap@x.com', referralCount: 3 },
    ]),
  },
}))

import AdminUserReferralsPage from './AdminUserReferralsPage'

describe('AdminUserReferralsPage', () => {
  it('lists referring users with their referral counts', async () => {
    render(<AdminUserReferralsPage />)
    await waitFor(() => expect(screen.getByText('Sasha Ibragimov')).toBeInTheDocument())
    expect(screen.getByText('Alex Partner')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
