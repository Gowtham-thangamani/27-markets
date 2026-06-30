import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToastProvider } from '@/context/ToastContext'
import PartnerReferralToolsPage from './PartnerReferralToolsPage'
import { partnerApi } from '@/lib/partnerApi'

vi.mock('@/lib/partnerApi', () => ({ partnerApi: { getProfile: vi.fn().mockResolvedValue({ referralCode: 'DEMO27IB', referralLink: 'https://app/register?ref=DEMO27IB' }) } }))

it('shows the referral link and a QR code', async () => {
  render(<ToastProvider><PartnerReferralToolsPage /></ToastProvider>)
  const matches = await screen.findAllByText(/register\?ref=DEMO27IB/)
  expect(matches.length).toBeGreaterThan(0)
  // QRCodeSVG renders an <svg>
  expect(document.querySelector('svg')).toBeInTheDocument()
})
