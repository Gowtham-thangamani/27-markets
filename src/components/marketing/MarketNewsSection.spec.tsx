import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { MarketNewsSection } from './MarketNewsSection'
import { loadMarketNews } from '@/lib/marketNews'

vi.mock('@/lib/marketNews', () => ({ loadMarketNews: vi.fn() }))
const mockLoad = loadMarketNews as unknown as Mock

const item = (over: Record<string, unknown>) => ({
  id: '1', headline: 'EURUSD rallies', summary: 'up', source: 'Reuters',
  url: 'https://x/1', image: '', datetime: 1_700_000_000, category: 'forex', ...over,
})

describe('MarketNewsSection', () => {
  beforeEach(() => mockLoad.mockReset())

  it('renders nothing when there is no news', async () => {
    mockLoad.mockResolvedValue([])
    const { container } = render(<MarketNewsSection />)
    await waitFor(() => expect(mockLoad).toHaveBeenCalled())
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders external cards for news items', async () => {
    mockLoad.mockResolvedValue([item({})])
    render(<MarketNewsSection />)
    const link = await screen.findByRole('link', { name: /EURUSD rallies/i })
    expect(link).toHaveAttribute('href', 'https://x/1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('shows category tabs and filters by the chosen category', async () => {
    mockLoad.mockResolvedValue([
      item({ id: 'f', headline: 'Forex headline', url: 'https://x/f', category: 'forex' }),
      item({ id: 'c', headline: 'Crypto headline', url: 'https://x/c', category: 'crypto' }),
    ])
    render(<MarketNewsSection />)
    // Both visible under the default "All" tab.
    expect(await screen.findByText('Forex headline')).toBeInTheDocument()
    expect(screen.getByText('Crypto headline')).toBeInTheDocument()
    // Clicking the Crypto tab hides the forex card.
    await userEvent.click(screen.getByRole('button', { name: 'Crypto' }))
    expect(screen.queryByText('Forex headline')).not.toBeInTheDocument()
    expect(screen.getByText('Crypto headline')).toBeInTheDocument()
  })
})
