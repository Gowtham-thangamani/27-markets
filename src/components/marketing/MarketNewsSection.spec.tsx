import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { MarketNewsSection } from './MarketNewsSection'
import { loadMarketNews } from '@/lib/marketNews'

vi.mock('@/lib/marketNews', () => ({ loadMarketNews: vi.fn() }))
const mockLoad = loadMarketNews as unknown as Mock

describe('MarketNewsSection', () => {
  beforeEach(() => mockLoad.mockReset())

  it('renders nothing when there is no news', async () => {
    mockLoad.mockResolvedValue([])
    const { container } = render(<MarketNewsSection />)
    await waitFor(() => expect(mockLoad).toHaveBeenCalled())
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders external cards for news items', async () => {
    mockLoad.mockResolvedValue([
      { id: '1', headline: 'EURUSD rallies', summary: 'up', source: 'Reuters', url: 'https://x/1', image: '', datetime: 1_700_000_000 },
    ])
    render(<MarketNewsSection />)
    const link = await screen.findByRole('link', { name: /EURUSD rallies/i })
    expect(link).toHaveAttribute('href', 'https://x/1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
