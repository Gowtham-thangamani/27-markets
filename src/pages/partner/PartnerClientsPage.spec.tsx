import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PartnerClientsPage from './PartnerClientsPage'
import { partnerApi } from '@/lib/partnerApi'

vi.mock('@/lib/partnerApi', () => ({ partnerApi: { getClients: vi.fn().mockResolvedValue([
  { id: 'c1', name: 'Ada Lovelace', email: 'ada@x.io', country: 'UK', kyc: 'APPROVED', createdAt: '2026-03-05T10:00:00Z' },
]) } }))

it('lists referred clients with their KYC status', async () => {
  render(<MemoryRouter><PartnerClientsPage /></MemoryRouter>)
  expect(await screen.findByText('ada@x.io')).toBeInTheDocument()
  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
})
