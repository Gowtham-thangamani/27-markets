// src/components/admin/table/DocumentViewerModal.spec.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentViewerModal } from './DocumentViewerModal'

describe('DocumentViewerModal', () => {
  it('renders an image for image urls', () => {
    render(<DocumentViewerModal open onClose={vi.fn()} url="/api/kyc/document/1" fileName="passport.png" />)
    expect(screen.getByRole('img', { name: 'passport.png' })).toBeInTheDocument()
  })

  it('renders an embed for pdf urls and shows download + open links', () => {
    render(<DocumentViewerModal open onClose={vi.fn()} url="/api/kyc/document/2" fileName="proof.pdf" />)
    expect(document.querySelector('embed')).toBeTruthy()
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute('href', '/api/kyc/document/2')
    expect(screen.getByRole('link', { name: /open in new tab/i })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<DocumentViewerModal open={false} onClose={vi.fn()} url="/api/kyc/document/3" fileName="x.png" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
