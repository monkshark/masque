import { DEFAULT_SETTINGS, DEFAULT_FEATURES, type Settings, type FeatureFlags } from '../types'

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get('settings')
  const s = (stored.settings as Partial<Settings> | undefined) ?? {}
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    features: { ...DEFAULT_FEATURES, ...(s.features as Partial<FeatureFlags> | undefined) },
  }
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next: Settings = {
    ...current,
    ...patch,
    features: { ...current.features, ...(patch.features ?? {}) },
  }
  await chrome.storage.local.set({ settings: next })
  return next
}

export async function setFeature(key: keyof FeatureFlags, value: boolean): Promise<Settings> {
  const current = await getSettings()
  return setSettings({ features: { ...current.features, [key]: value } })
}

export function userScriptsAvailable(): boolean {
  try {
    return typeof chrome.userScripts !== 'undefined'
  } catch {
    return false
  }
}

export function openExtensionDetails(): void {
  try {
    void chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })
  } catch {
    void 0
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export function isExcepted(url: string, exceptions: string[]): boolean {
  const host = hostOf(url)
  if (!host) return false
  return exceptions.some((e) => host === e || host.endsWith('.' + e))
}
