import { describe, it, expect } from 'vitest'
import { acceptLanguage, secChUa } from '../src/core/headers'

describe('acceptLanguage', () => {
  it('returns empty string for no languages', () => {
    expect(acceptLanguage([])).toBe('')
  })

  it('keeps the first language without a q value', () => {
    expect(acceptLanguage(['en-US'])).toBe('en-US')
  })

  it('appends descending q values to later languages', () => {
    expect(acceptLanguage(['en-US', 'en'])).toBe('en-US,en;q=0.9')
    expect(acceptLanguage(['ko', 'en-US', 'en'])).toBe('ko,en-US;q=0.9,en;q=0.8')
  })
})

describe('secChUa', () => {
  it('formats brand list as a sec-ch-ua header value', () => {
    expect(
      secChUa([
        { brand: 'Not/A)Brand', version: '99' },
        { brand: 'Google Chrome', version: '127' },
      ]),
    ).toBe('"Not/A)Brand";v="99", "Google Chrome";v="127"')
  })
})
