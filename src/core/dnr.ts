import type { Persona, Settings } from '../types'
import { acceptLanguage, secChUa } from './headers'
import { personaById, resolvePersona, WINDOWS_CHROME } from './personas'

export const RULE_ID = 1
export const SUBRESOURCE_RULE_ID = 2
export const MAX_SITE_RULES = 24
export const ALL_RULE_IDS: number[] = Array.from({ length: 2 + MAX_SITE_RULES * 2 }, (_, i) => i + 1)

// Frames take the persona of the document they load, so match on the request domain.
const FRAME_TYPES = ['main_frame', 'sub_frame']

// Subresources must carry the persona of the page that issued them (e.g. a chzzk.naver.com
// page fetching from ssl.pstatic.net), so match on the initiator domain.
const SUBRESOURCE_TYPES = [
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
  condition: {
    resourceTypes: string[]
    requestDomains?: string[]
    excludedRequestDomains?: string[]
    initiatorDomains?: string[]
    excludedInitiatorDomains?: string[]
  }
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

function frameAndSubresourceRules(
  ids: [number, number],
  priority: number,
  requestHeaders: DnrHeader[],
  domains: string[] | null,
  exceptions: string[],
): DnrRule[] {
  const action = { type: 'modifyHeaders' as const, requestHeaders }
  const excluded = exceptions.length ? exceptions : undefined
  return [
    {
      id: ids[0],
      priority,
      action,
      condition: {
        resourceTypes: FRAME_TYPES,
        ...(domains ? { requestDomains: domains } : {}),
        ...(excluded ? { excludedRequestDomains: excluded } : {}),
      },
    },
    {
      id: ids[1],
      priority,
      action,
      condition: {
        resourceTypes: SUBRESOURCE_TYPES,
        ...(domains ? { initiatorDomains: domains } : {}),
        ...(excluded ? { excludedInitiatorDomains: excluded } : {}),
      },
    },
  ]
}

export function buildDnrRules(persona: Persona, settings: Settings): DnrRule[] {
  if (!settings.enabled || !settings.features.httpHeaders) return []

  const siteRules = settings.siteRules.filter((r) => r.enabled).slice(0, MAX_SITE_RULES)
  const rules: DnrRule[] = []

  if (settings.scope !== 'sites') {
    const requestHeaders = headersFor(persona, settings)
    if (requestHeaders.length > 0) {
      rules.push(
        ...frameAndSubresourceRules([RULE_ID, SUBRESOURCE_RULE_ID], 1, requestHeaders, null, settings.exceptions),
      )
    }
  }

  siteRules.forEach((rule, i) => {
    const rulePersona = resolvePersona(personaById(rule.personaId) ?? WINDOWS_CHROME, rule.overrides)
    const requestHeaders = headersFor(rulePersona, settings)
    if (requestHeaders.length === 0) return
    const base = 3 + i * 2
    rules.push(
      ...frameAndSubresourceRules([base, base + 1], 2, requestHeaders, [rule.pattern], settings.exceptions),
    )
  })

  return rules
}
