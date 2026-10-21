import type { Settings, Persona, FeatureFlags } from '../types'
import { personaById, WINDOWS_CHROME, resolvePersona, resolvePersonaForHost } from '../core/personas'
import { getSettings, isExcepted, hostOf, matchSiteRule } from '../core/settings'

function activePersona(settings: Settings): Persona {
  const base = personaById(settings.activePersonaId) ?? WINDOWS_CHROME
  return resolvePersona(base, settings.overrides)
}
import { buildDnrRules, ALL_RULE_IDS } from '../core/dnr'
import { applyInPage, type InjectOptions } from '../inject/applyInPage'

function optsFrom(f: FeatureFlags, seed: number): InjectOptions {
  return {
    seed,
    userAgent: f.userAgent,
    languages: f.languages,
    hardware: f.hardware,
    screen: f.screen,
    webgl: f.webgl,
    timezone: f.timezone,
    touch: f.touch,
    webdriver: f.webdriver,
    plugins: f.plugins,
    mediaDevices: f.mediaDevices,
    connection: f.connection,
    speech: f.speech,
    storage: f.storage,
    keyboard: f.keyboard,
    webgpu: f.webgpu,
    battery: f.battery,
    canvas: f.canvas,
    audio: f.audio,
    fonts: f.fonts,
    iframes: f.iframes,
    workers: f.workers,
  }
}

const USER_SCRIPT_ID = 'persona'

function hasUserScripts(): boolean {
  try {
    return typeof chrome.userScripts !== 'undefined'
  } catch {
    return false
  }
}

function buildCode(
  defaultPersona: Persona | null,
  opts: InjectOptions,
  siteRules: { pattern: string; persona: Persona }[],
): string {
  const matcher = `var __rules=${JSON.stringify(siteRules)};var __host=(location&&location.hostname)||'';var __persona=${JSON.stringify(defaultPersona)};for(var __i=0;__i<__rules.length;__i++){var __r=__rules[__i];if(__host===__r.pattern||__host.slice(-(__r.pattern.length+1))==='.'+__r.pattern){__persona=__r.persona;break;}}`
  return `;(function(){${matcher}if(!__persona)return;(${applyInPage.toString()})(__persona,${JSON.stringify(opts)});})();`
}

function siteRulesFor(settings: Settings): { pattern: string; persona: Persona }[] {
  return settings.siteRules
    .filter((r) => r.enabled)
    .map((r) => ({
      pattern: r.pattern,
      persona: resolvePersona(personaById(r.personaId) ?? WINDOWS_CHROME, r.overrides),
    }))
}

function matchesForHosts(hosts: string[]): string[] {
  const out: string[] = []
  for (const h of hosts) {
    out.push(`*://${h}/*`, `*://*.${h}/*`)
  }
  return out
}

async function syncUserScripts(settings: Settings): Promise<void> {
  if (!hasUserScripts()) return

  try {
    const siteRules = siteRulesFor(settings)
    const sitesOnly = settings.scope === 'sites'

    if (!settings.enabled || (sitesOnly && siteRules.length === 0)) {
      const existing = await chrome.userScripts.getScripts({ ids: [USER_SCRIPT_ID] })
      if (existing.length) await chrome.userScripts.unregister({ ids: [USER_SCRIPT_ID] })
      return
    }

    const persona = sitesOnly ? null : activePersona(settings)
    const code = buildCode(persona, optsFrom(settings.features, settings.seed), siteRules)

    const script: chrome.userScripts.RegisteredUserScript = {
      id: USER_SCRIPT_ID,
      matches: sitesOnly ? matchesForHosts(siteRules.map((r) => r.pattern)) : ['<all_urls>'],
      excludeMatches: matchesForHosts(settings.exceptions),
      js: [{ code }],
      world: 'MAIN',
      runAt: 'document_start',
      allFrames: true,
    }

    const existing = await chrome.userScripts.getScripts({ ids: [USER_SCRIPT_ID] })
    if (existing.length) await chrome.userScripts.update([script])
    else await chrome.userScripts.register([script])
  } catch {
    void 0
  }
}

async function syncNetwork(settings: Settings): Promise<void> {
  const persona = activePersona(settings)

  const addRules = buildDnrRules(persona, settings)
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ALL_RULE_IDS,
    addRules: addRules as unknown as chrome.declarativeNetRequest.Rule[],
  })

  try {
    const policy = chrome.privacy?.network?.webRTCIPHandlingPolicy
    if (policy) {
      policy.set({
        value:
          settings.enabled && settings.features.webrtc
            ? 'disable_non_proxied_udp'
            : 'default',
      })
    }
  } catch {
    void 0
  }
}

async function syncAll(): Promise<void> {
  const settings = await getSettings()
  await Promise.all([syncUserScripts(settings), syncNetwork(settings)])
}

chrome.runtime.onInstalled.addListener(() => {
  void syncAll()
})

chrome.runtime.onStartup.addListener(() => {
  void syncAll()
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) void syncAll()
})

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (hasUserScripts()) return
  const settings = await getSettings()
  if (!settings.enabled) return
  if (!/^https?:/.test(details.url)) return
  if (isExcepted(details.url, settings.exceptions)) return

  const host = hostOf(details.url)
  if (settings.scope === 'sites' && !matchSiteRule(host, settings.siteRules)) return
  const persona = resolvePersonaForHost(host, settings)

  try {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId, frameIds: [details.frameId] },
      world: 'MAIN',
      injectImmediately: true,
      func: applyInPage,
      args: [persona, optsFrom(settings.features, settings.seed)],
    })
  } catch {
    void 0
  }
})
