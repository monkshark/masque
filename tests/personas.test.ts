import { describe, it, expect } from 'vitest'
import { resolvePersonaForHost, resolvePersona, WINDOWS_CHROME, MAC_CHROME } from '../src/core/personas'
import { DEFAULT_SETTINGS } from '../src/types'
import type { SiteRule } from '../src/types'

describe('resolvePersonaForHost', () => {
  it('falls back to the global active persona when no site rule matches', () => {
    const settings = { ...DEFAULT_SETTINGS, activePersonaId: 'win-chrome' }
    expect(resolvePersonaForHost('example.com', settings).id).toBe(WINDOWS_CHROME.id)
  })

  it('uses the site rule persona on the matching domain', () => {
    const rule: SiteRule = { id: '1', pattern: 'bc.com', personaId: 'mac-chrome', enabled: true }
    const settings = { ...DEFAULT_SETTINGS, activePersonaId: 'win-chrome', siteRules: [rule] }
    expect(resolvePersonaForHost('bc.com', settings).id).toBe(MAC_CHROME.id)
  })

  it('applies the site rule persona to subdomains too', () => {
    const rule: SiteRule = { id: '1', pattern: 'bc.com', personaId: 'mac-chrome', enabled: true }
    const settings = { ...DEFAULT_SETTINGS, activePersonaId: 'win-chrome', siteRules: [rule] }
    expect(resolvePersonaForHost('a.bc.com', settings).id).toBe(MAC_CHROME.id)
  })

  it('applies the site rule overrides on top of its persona', () => {
    const rule: SiteRule = {
      id: '1',
      pattern: 'bc.com',
      personaId: 'mac-chrome',
      enabled: true,
      overrides: { timezone: 'Asia/Seoul' },
    }
    const settings = { ...DEFAULT_SETTINGS, siteRules: [rule] }
    expect(resolvePersonaForHost('bc.com', settings).timezone).toBe('Asia/Seoul')
  })

  it('does not apply a disabled site rule', () => {
    const rule: SiteRule = { id: '1', pattern: 'bc.com', personaId: 'mac-chrome', enabled: false }
    const settings = { ...DEFAULT_SETTINGS, activePersonaId: 'win-chrome', siteRules: [rule] }
    expect(resolvePersonaForHost('bc.com', settings).id).toBe(WINDOWS_CHROME.id)
  })
})

describe('resolvePersona', () => {
  it('returns the base persona unchanged when there are no overrides', () => {
    expect(resolvePersona(WINDOWS_CHROME)).toBe(WINDOWS_CHROME)
  })

  it('overrides ua, platform and vendor', () => {
    const next = resolvePersona(WINDOWS_CHROME, { ua: 'custom-ua', platform: 'Custom', vendor: 'Custom Inc.' })
    expect(next.ua).toBe('custom-ua')
    expect(next.platform).toBe('Custom')
    expect(next.vendor).toBe('Custom Inc.')
  })

  it('overrides maxTouchPoints', () => {
    expect(resolvePersona(WINDOWS_CHROME, { maxTouchPoints: 10 }).maxTouchPoints).toBe(10)
  })

  it('merges a partial screen override on top of the base screen', () => {
    const next = resolvePersona(WINDOWS_CHROME, { screen: { width: 1024, height: 768 } })
    expect(next.screen.width).toBe(1024)
    expect(next.screen.height).toBe(768)
    expect(next.screen.colorDepth).toBe(WINDOWS_CHROME.screen.colorDepth)
  })

  it('merges a partial webgl override on top of the base webgl', () => {
    const next = resolvePersona(WINDOWS_CHROME, { webgl: { renderer: 'Custom Renderer' } })
    expect(next.webgl.renderer).toBe('Custom Renderer')
    expect(next.webgl.vendor).toBe(WINDOWS_CHROME.webgl.vendor)
  })
})
