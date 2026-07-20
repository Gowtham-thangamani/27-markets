import { primaryOrigin } from './origin'

describe('primaryOrigin', () => {
  it('returns a single origin unchanged', () => {
    expect(primaryOrigin('https://27markets.com')).toBe('https://27markets.com')
  })

  it('takes the first entry of a comma-separated allow-list', () => {
    expect(primaryOrigin('https://27markets.com,https://www.27markets.com')).toBe('https://27markets.com')
  })

  it('trims whitespace around the chosen origin', () => {
    expect(primaryOrigin(' https://a.com , https://b.com ')).toBe('https://a.com')
  })

  it('falls back to localhost when unset or empty', () => {
    expect(primaryOrigin(undefined)).toBe('http://localhost:5173')
    expect(primaryOrigin('')).toBe('http://localhost:5173')
    expect(primaryOrigin(' , ')).toBe('http://localhost:5173')
  })
})
