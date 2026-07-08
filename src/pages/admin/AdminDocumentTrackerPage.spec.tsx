import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listAllKycDocuments: vi.fn().mockResolvedValue([
      { id: 'd1', step: 'identity', fileName: 'passport.jpg', mimeType: 'image/jpeg', createdAt: '2026-06-20T00:00:00.000Z', owner: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' } },
      { id: 'd2', step: 'address', fileName: 'utility.pdf', mimeType: 'application/pdf', createdAt: '2026-06-21T00:00:00.000Z', owner: { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.com' } },
    ]),
  },
}))

import AdminDocumentTrackerPage from './AdminDocumentTrackerPage'

describe('AdminDocumentTrackerPage', () => {
  it('lists uploaded KYC documents with owner and type', async () => {
    render(<AdminDocumentTrackerPage />)
    await waitFor(() => expect(screen.getByText('passport.jpg')).toBeInTheDocument())
    expect(screen.getByText('utility.pdf')).toBeInTheDocument()
    // "identity"/"address" appear in both the row badge and the filter dropdown.
    expect(screen.getAllByText('identity').length).toBeGreaterThan(0)
    expect(screen.getAllByText('address').length).toBeGreaterThan(0)
  })
})
