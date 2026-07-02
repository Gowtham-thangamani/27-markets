import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminPlaceholderPage from './AdminPlaceholderPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<AdminPlaceholderPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminPlaceholderPage', () => {
  it('renders the section label for a known placeholder path', () => {
    renderAt('/admin/payment-gateways')
    expect(screen.getByText('Payment Gateways is coming soon')).toBeInTheDocument()
  })

  it('renders a generic title for an unknown path', () => {
    renderAt('/admin/totally-unknown')
    expect(screen.getByText('This section is coming soon')).toBeInTheDocument()
  })
})
