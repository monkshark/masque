import type { Persona, Settings } from '../types'
import { acceptLanguage, secChUa } from './headers'

export const RULE_ID = 1

export interface DnrHeader {
  header: string
  operation: 'set'
  value: string
}

export interface DnrRule {
  id: number
  priority: number
  action: { type: 'modifyHeaders'; requestHeaders: DnrHeader[] }
  condition: { resourceTypes: string[]; excludedRequestDomains?: string[] }
}

export function buildDnrRules(persona: Persona, settings: Settings): DnrRule[] {
  if (!settings.enabled || !settings.features.httpHeaders) return []

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

  if (requestHeaders.length === 0) return []

  return [
    {
      id: RULE_ID,
      priority: 1,
      action: { type: 'modifyHeaders', requestHeaders },
      condition: {
        resourceTypes: [
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
        ],
        ...(settings.exceptions.length
          ? { excludedRequestDomains: settings.exceptions }
          : {}),
      },
    },
  ]
}
