export interface UaData {
  platform: string
  platformVersion: string
  mobile: boolean
  architecture: string
  bitness: string
  uaFullVersion: string
  brands: { brand: string; version: string }[]
}

export interface Persona {
  id: string
  label: string
  ua: string
  platform: string
  vendor: string
  language: string
  languages: string[]
  hardwareConcurrency: number
  deviceMemory: number
  devicePixelRatio: number
  screen: {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
  }
  webgl: { vendor: string; renderer: string }
  timezone: string
  maxTouchPoints: number
  uaData: UaData
}

export interface FeatureFlags {
  userAgent: boolean
  languages: boolean
  hardware: boolean
  screen: boolean
  webgl: boolean
  timezone: boolean
  touch: boolean
  webdriver: boolean
  plugins: boolean
  mediaDevices: boolean
  connection: boolean
  speech: boolean
  storage: boolean
  keyboard: boolean
  webgpu: boolean
  battery: boolean
  canvas: boolean
  audio: boolean
  fonts: boolean
  iframes: boolean
  workers: boolean
  httpHeaders: boolean
  webrtc: boolean
}

export interface PersonaOverrides {
  timezone?: string
  languages?: string[]
  hardwareConcurrency?: number
  deviceMemory?: number
  devicePixelRatio?: number
}

export interface Settings {
  enabled: boolean
  activePersonaId: string
  seed: number
  exceptions: string[]
  features: FeatureFlags
  overrides: PersonaOverrides
}

export const DEFAULT_FEATURES: FeatureFlags = {
  userAgent: true,
  languages: true,
  hardware: true,
  screen: true,
  webgl: true,
  timezone: true,
  touch: true,
  webdriver: true,
  plugins: true,
  mediaDevices: true,
  connection: true,
  speech: true,
  storage: true,
  keyboard: true,
  webgpu: true,
  battery: true,
  canvas: true,
  audio: true,
  fonts: true,
  iframes: true,
  workers: true,
  httpHeaders: true,
  webrtc: true,
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  activePersonaId: 'win-chrome',
  seed: 1337,
  exceptions: [],
  features: DEFAULT_FEATURES,
  overrides: {},
}

export interface FeatureMeta {
  key: keyof FeatureFlags
  label: string
  description: string
  group: 'identity' | 'noise' | 'hardening' | 'network'
}

export const FEATURE_META: FeatureMeta[] = [
  { key: 'userAgent', label: 'User-Agent / UA-CH', description: 'navigator.userAgent, platform, vendor, userAgentData', group: 'identity' },
  { key: 'languages', label: 'Languages', description: 'navigator.language, navigator.languages', group: 'identity' },
  { key: 'hardware', label: 'Hardware', description: 'hardwareConcurrency, deviceMemory', group: 'identity' },
  { key: 'screen', label: 'Screen / window', description: 'screen size, devicePixelRatio, outerWidth/Height', group: 'identity' },
  { key: 'webgl', label: 'WebGL', description: 'unmasked vendor / renderer', group: 'identity' },
  { key: 'timezone', label: 'Timezone', description: 'Intl timeZone, getTimezoneOffset (DST-aware)', group: 'identity' },
  { key: 'touch', label: 'Touch points', description: 'navigator.maxTouchPoints', group: 'identity' },
  { key: 'webdriver', label: 'webdriver flag', description: 'navigator.webdriver = false', group: 'identity' },
  { key: 'plugins', label: 'Plugins', description: 'navigator.plugins / mimeTypes normalized to a canonical set', group: 'identity' },
  { key: 'mediaDevices', label: 'Media devices', description: 'enumerateDevices count and labels', group: 'identity' },
  { key: 'connection', label: 'Network info', description: 'navigator.connection effectiveType / rtt / downlink', group: 'identity' },
  { key: 'speech', label: 'Speech voices', description: 'speechSynthesis.getVoices normalized to a canonical list', group: 'identity' },
  { key: 'storage', label: 'Storage quota', description: 'navigator.storage.estimate quota / usage', group: 'identity' },
  { key: 'keyboard', label: 'Keyboard layout', description: 'navigator.keyboard.getLayoutMap normalized to US QWERTY', group: 'identity' },
  { key: 'webgpu', label: 'WebGPU adapter', description: 'navigator.gpu adapter info vendor', group: 'identity' },
  { key: 'battery', label: 'Battery', description: 'navigator.getBattery normalized (charging, full)', group: 'identity' },
  { key: 'canvas', label: 'Canvas farbling', description: 'seeded noise on getImageData / toDataURL', group: 'noise' },
  { key: 'audio', label: 'Audio farbling', description: 'seeded noise on AudioBuffer.getChannelData', group: 'noise' },
  { key: 'fonts', label: 'Font metrics', description: 'per-element sub-pixel noise on getBoundingClientRect / measureText to disrupt font enumeration', group: 'noise' },
  { key: 'iframes', label: 'Harden iframes', description: 'apply spoof to dynamically created iframes', group: 'hardening' },
  { key: 'workers', label: 'Harden workers', description: 'apply spoof inside Web Workers (may break some sites)', group: 'hardening' },
  { key: 'httpHeaders', label: 'HTTP headers (DNR)', description: 'rewrite User-Agent / Accept-Language / sec-ch-ua', group: 'network' },
  { key: 'webrtc', label: 'WebRTC protection', description: 'disable_non_proxied_udp policy', group: 'network' },
]
