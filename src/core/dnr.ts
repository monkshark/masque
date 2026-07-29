import type { Persona, Settings } from '../types'
import { acceptLanguage, secChUa } from './headers'
import { personaById, resolvePersona, WINDOWS_CHROME } from './personas'

export const RULE_ID = 1
export const MAX_SITE_RULES = 49
export const ALL_RULE_IDS: number[] = Array.from({ length: MAX_SITE_RULES + 1 }, (_, i) => i + 1)

const RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'xmlhttprequest',
  'script',
  'stylesheet',
  'image',
  'font',
  'media',
  'websocket',
  'other',
]

export interface DnrHeader {
  header: string
  operation: 'set'
  value: string
}

export interface DnrRule {
  id: number
  priority: number
  action: { type: 'modifyHeaders'; requestHeaders: DnrHeader[] }
  condition: { resourceTypes: string[]; requestDomains?: string[]; excludedRequestDomains?: string[] }
}

function headersFor(persona: Persona, settings: Settings): DnrHeader[] {
  const requestHeaders: DnrHeader[] = []
  if (settings.features.userAgent) {
    requestHeaders.push(
      { header: 'user-agent', operation: 'set', value: persona.ua },
      { header: 'sec-ch-ua', operation: 'set', value: secChUa(persona.uaData.brands) },
      { header: 'sec-ch-ua-mobile', operation: 'set', value: persona.uaData.mobile ? '?1' : '?0' },
      { header: 'sec-ch-ua-platform', operation: 'set', value: `"${persona.uaData.platform}"` },
    )
  }
  if (settings.features.languages) {
    requestHeaders.push({
      header: 'accept-language',
      operation: 'set',
      value: acceptLanguage(persona.languages),
    })
  }
  return requestHeaders
}

export function buildDnrRules(persona: Persona, settings: Settings): DnrRule[] {
  if (!settings.enabled || !settings.features.httpHeaders) return []

  const siteRules = settings.siteRules.filter((r) => r.enabled).slice(0, MAX_SITE_RULES)
  const rules: DnrRule[] = []

  siteRules.forEach((rule, i) => {
    const rulePersona = resolvePersona(personaById(rule.personaId) ?? WINDOWS_CHROME, rule.overrides)
    const requestHeaders = headersFor(rulePersona, settings)
    if (requestHeaders.length === 0) return
    rules.push({
      id: i + 2,
      priority: 2,
      action: { type: 'modifyHeaders', requestHeaders },
      condition: { resourceTypes: RESOURCE_TYPES, requestDomains: [rule.pattern] },
    })
  })

  const requestHeaders = headersFor(persona, settings)
  if (requestHeaders.length > 0) {
    const excluded = [...settings.exceptions, ...siteRules.map((r) => r.pattern)]
    rules.unshift({
      id: RULE_ID,
      priority: 1,
      action: { type: 'modifyHeaders', requestHeaders },
      condition: {
        resourceTypes: RESOURCE_TYPES,
        ...(excluded.length ? { excludedRequestDomains: excluded } : {}),
      },
    })
  }

  return rules
}
