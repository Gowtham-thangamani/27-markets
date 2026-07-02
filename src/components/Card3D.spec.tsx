import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card3D } from './Card3D'

describe('Card3D', () => {
  const original = window.matchMedia

  afterEach(() => {
    window.matchMedia = original
  })

  it('renders its children (interactive path)', () => {
    render(
      <Card3D>
        <div>tilt me</div>
      </Card3D>,
    )
    expect(screen.getByText('tilt me')).toBeInTheDocument()
  })

  it('passes through className', () => {
    render(
      <Card3D className="h-full custom-x">
        <div>content</div>
      </Card3D>,
    )
    expect(document.querySelector('.custom-x')).toBeTruthy()
  })

  it('renders a static wrapper (no motion handlers) when reduced motion is preferred', () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia

    render(
      <Card3D>
        <div>reduced</div>
      </Card3D>,
    )
    expect(screen.getByText('reduced')).toBeInTheDocument()
  })
})
