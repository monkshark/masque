import { describe, it, expect } from 'vitest'
import { hostOf, isExcepted } from '../src/core/settings'

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
