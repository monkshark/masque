import { describe, it, expect } from 'vitest'
import { buildDnrRules, RULE_ID } from '../src/core/dnr'
import { WINDOWS_CHROME } from '../src/core/personas'
import { DEFAULT_SETTINGS } from '../src/types'

describe('buildDnrRules', () => {
  it('returns no rules when disabled', () => {
    expect(buildDnrRules(WINDOWS_CHROME, { ...DEFAULT_SETTINGS, enabled: false })).toEqual([])
  })

  it('returns no rules when httpHeaders feature is off', () => {
    expect(
      buildDnrRules(WINDOWS_CHROME, {
        ...DEFAULT_SETTINGS,
        features: { ...DEFAULT_SETTINGS.features, httpHeaders: false },
      }),
    ).toEqual([])
  })

  it('omits user-agent headers when userAgent feature is off', () => {
    const rules = buildDnrRules(WINDOWS_CHROME, {
      ...DEFAULT_SETTINGS,
      features: { ...DEFAULT_SETTINGS.features, userAgent: false },
    })
    const headers = rules[0].action.requestHeaders.map((h) => h.header)
    expect(headers).not.toContain('user-agent')
    expect(headers).toContain('accept-language')
  })

  it('sets the user-agent header to the persona ua', () => {
    const [rule] = buildDnrRules(WINDOWS_CHROME, DEFAULT_SETTINGS)
    expect(rule.id).toBe(RULE_ID)
    const ua = rule.action.requestHeaders.find((h) => h.header === 'user-agent')
    expect(ua?.value).toBe(WINDOWS_CHROME.ua)
  })

  it('sets sec-ch-ua-platform and mobile from persona uaData', () => {
    const [rule] = buildDnrRules(WINDOWS_CHROME, DEFAULT_SETTINGS)
    const platform = rule.action.requestHeaders.find((h) => h.header === 'sec-ch-ua-platform')
    const mobile = rule.action.requestHeaders.find((h) => h.header === 'sec-ch-ua-mobile')
    expect(platform?.value).toBe('"Windows"')
    expect(mobile?.value).toBe('?0')
  })

  it('omits excludedRequestDomains when there are no exceptions', () => {
    const [rule] = buildDnrRules(WINDOWS_CHROME, DEFAULT_SETTINGS)
    expect(rule.condition.excludedRequestDomains).toBeUndefined()
  })

  it('includes exceptions as excludedRequestDomains', () => {
    const [rule] = buildDnrRules(WINDOWS_CHROME, {
      ...DEFAULT_SETTINGS,
      exceptions: ['example.com'],
    })
    expect(rule.condition.excludedRequestDomains).toEqual(['example.com'])
  })
})
