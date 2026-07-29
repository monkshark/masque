import { describe, it, expect } from 'vitest'
import { hostOf, isExcepted, matchSiteRule } from '../src/core/settings'
import type { SiteRule } from '../src/types'

function rule(pattern: string, overrides: Partial<SiteRule> = {}): SiteRule {
  return { id: pattern, pattern, personaId: 'mac-chrome', enabled: true, ...overrides }
}

describe('hostOf', () => {
  it('extracts the hostname from a url', () => {
    expect(hostOf('https://www.example.com/path?q=1')).toBe('www.example.com')
  })

  it('returns empty string for an invalid url', () => {
    expect(hostOf('not a url')).toBe('')
  })
})

describe('isExcepted', () => {
  it('matches an exact host', () => {
    expect(isExcepted('https://example.com/', ['example.com'])).toBe(true)
  })

  it('matches a subdomain of an excepted host', () => {
    expect(isExcepted('https://app.example.com/', ['example.com'])).toBe(true)
  })

  it('does not match an unrelated host', () => {
    expect(isExcepted('https://other.com/', ['example.com'])).toBe(false)
  })

  it('does not match a partial suffix that is not a subdomain', () => {
    expect(isExcepted('https://notexample.com/', ['example.com'])).toBe(false)
  })
})

describe('matchSiteRule', () => {
  it('matches an exact host', () => {
    expect(matchSiteRule('bc.com', [rule('bc.com')])?.pattern).toBe('bc.com')
  })

  it('matches a subdomain of the rule pattern', () => {
    expect(matchSiteRule('a.bc.com', [rule('bc.com')])?.pattern).toBe('bc.com')
  })

  it('does not match an unrelated host', () => {
    expect(matchSiteRule('other.com', [rule('bc.com')])).toBeUndefined()
  })

  it('ignores disabled rules', () => {
    expect(matchSiteRule('bc.com', [rule('bc.com', { enabled: false })])).toBeUndefined()
  })

  it('returns the first matching rule', () => {
    const rules = [rule('bc.com', { id: 'a', personaId: 'win-chrome' }), rule('bc.com', { id: 'b', personaId: 'mac-chrome' })]
    expect(matchSiteRule('bc.com', rules)?.id).toBe('a')
  })
})
