import type { Persona, PersonaOverrides } from '../types'

export const WINDOWS_CHROME: Persona = {
  id: 'win-chrome',
  label: 'Windows · Chrome',
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  platform: 'Win32',
  vendor: 'Google Inc.',
  language: 'en-US',
  languages: ['en-US', 'en'],
  hardwareConcurrency: 8,
  deviceMemory: 8,
  devicePixelRatio: 1,
  screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24 },
  webgl: {
    vendor: 'Google Inc. (NVIDIA)',
    renderer:
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  },
  timezone: 'America/New_York',
  maxTouchPoints: 0,
  uaData: {
    platform: 'Windows',
    platformVersion: '15.0.0',
    mobile: false,
    architecture: 'x86',
    bitness: '64',
    uaFullVersion: '127.0.0.0',
    brands: [
      { brand: 'Not/A)Brand', version: '99' },
      { brand: 'Google Chrome', version: '127' },
      { brand: 'Chromium', version: '127' },
    ],
  },
}

export const MAC_CHROME: Persona = {
  id: 'mac-chrome',
  label: 'macOS · Chrome',
  ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  platform: 'MacIntel',
  vendor: 'Google Inc.',
  language: 'en-US',
  languages: ['en-US', 'en'],
  hardwareConcurrency: 10,
  deviceMemory: 8,
  devicePixelRatio: 2,
  screen: { width: 1512, height: 982, availWidth: 1512, availHeight: 944, colorDepth: 30 },
  webgl: {
    vendor: 'Google Inc. (Apple)',
    renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
  },
  timezone: 'America/Los_Angeles',
  maxTouchPoints: 0,
  uaData: {
    platform: 'macOS',
    platformVersion: '14.5.0',
    mobile: false,
    architecture: 'arm',
    bitness: '64',
    uaFullVersion: '127.0.0.0',
    brands: [
      { brand: 'Not/A)Brand', version: '99' },
      { brand: 'Google Chrome', version: '127' },
      { brand: 'Chromium', version: '127' },
    ],
  },
}

export const ANDROID_CHROME: Persona = {
  id: 'android-chrome',
  label: 'Android · Chrome',
  ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
  platform: 'Linux armv81',
  vendor: 'Google Inc.',
  language: 'en-US',
  languages: ['en-US', 'en'],
  hardwareConcurrency: 8,
  deviceMemory: 8,
  devicePixelRatio: 2.625,
  screen: { width: 412, height: 915, availWidth: 412, availHeight: 915, colorDepth: 24 },
  webgl: {
    vendor: 'Google Inc. (Qualcomm)',
    renderer: 'ANGLE (Qualcomm, Adreno (TM) 730, OpenGL ES 3.2)',
  },
  timezone: 'America/New_York',
  maxTouchPoints: 5,
  uaData: {
    platform: 'Android',
    platformVersion: '14.0.0',
    mobile: true,
    architecture: '',
    bitness: '',
    uaFullVersion: '127.0.0.0',
    brands: [
      { brand: 'Not/A)Brand', version: '99' },
      { brand: 'Google Chrome', version: '127' },
      { brand: 'Chromium', version: '127' },
    ],
  },
}

export const PRESETS: Persona[] = [WINDOWS_CHROME, MAC_CHROME, ANDROID_CHROME]

export function personaById(id: string): Persona | undefined {
  return PRESETS.find((p) => p.id === id)
}

export function resolvePersona(base: Persona, ov?: PersonaOverrides): Persona {
  if (!ov) return base
  const next: Persona = { ...base }
  if (ov.timezone) next.timezone = ov.timezone
  if (ov.languages && ov.languages.length) {
    next.languages = [...ov.languages]
    next.language = ov.languages[0]
  }
  if (typeof ov.hardwareConcurrency === 'number') next.hardwareConcurrency = ov.hardwareConcurrency
  if (typeof ov.deviceMemory === 'number') next.deviceMemory = ov.deviceMemory
  if (typeof ov.devicePixelRatio === 'number') next.devicePixelRatio = ov.devicePixelRatio
  return next
}
