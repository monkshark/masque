import { describe, it, expect, beforeAll } from 'vitest'
import { applyInPage } from '../src/inject/applyInPage'
import { WINDOWS_CHROME } from '../src/core/personas'

describe('applyInPage', () => {
  beforeAll(() => {
    applyInPage(WINDOWS_CHROME, {
      seed: 1337,
      userAgent: true,
      languages: true,
      hardware: true,
      screen: true,
      webgl: true,
      timezone: true,
      touch: true,
      webdriver: true,
      plugins: true,
      mediaDevices: false,
      connection: true,
      speech: false,
      storage: false,
      keyboard: false,
      webgpu: false,
      battery: false,
      canvas: false,
      audio: false,
      fonts: false,
      iframes: false,
      workers: false,
    })
  })

  it('leaves no detectable global marker', () => {
    expect((window as unknown as Record<string, unknown>).__masque).toBeUndefined()
    expect((window as unknown as Record<string, unknown>).__masqueApplied).toBeUndefined()
    expect((window as unknown as Record<string, unknown>).__masqueMask).toBeUndefined()
  })

  it('overrides navigator.userAgent', () => {
    expect(navigator.userAgent).toBe(WINDOWS_CHROME.ua)
  })

  it('overrides navigator.platform and languages', () => {
    expect(navigator.platform).toBe('Win32')
    expect(Array.from(navigator.languages)).toEqual(['en-US', 'en'])
  })

  it('overrides screen dimensions and devicePixelRatio', () => {
    expect(screen.width).toBe(1920)
    expect(screen.height).toBe(1080)
    expect(window.devicePixelRatio).toBe(1)
  })

  it('overrides maxTouchPoints and webdriver', () => {
    expect(navigator.maxTouchPoints).toBe(0)
    expect(navigator.webdriver).toBe(false)
  })

  it('normalizes plugins to the canonical desktop set', () => {
    expect(navigator.plugins.length).toBe(5)
    expect(navigator.plugins[0].name).toBe('PDF Viewer')
  })

  it('reports the persona timezone consistently across Date methods', () => {
    const d = new Date('2026-06-15T12:00:00Z')
    expect(d.getTimezoneOffset()).toBe(240)
    expect(d.toString()).toContain('GMT-0400')
    expect(d.toString()).not.toMatch(/Korea|Asia|Seoul/)
  })

  it('exposes a spoofed network connection', () => {
    const conn = (navigator as unknown as { connection: { effectiveType: string; rtt: number } })
      .connection
    expect(conn.effectiveType).toBe('4g')
    expect(conn.rtt).toBe(50)
  })

  it('masks patched function toString as native code', () => {
    expect(Function.prototype.toString.call(navigator.userAgentData!.getHighEntropyValues)).toContain(
      '[native code]',
    )
  })

  it('exposes spoofed userAgentData high entropy values', async () => {
    const uaData = (navigator as unknown as {
      userAgentData: { getHighEntropyValues: (h: string[]) => Promise<{ platform: string }> }
    }).userAgentData
    const high = await uaData.getHighEntropyValues(['platform'])
    expect(high.platform).toBe('Windows')
  })
})
