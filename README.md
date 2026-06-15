# Masque

A Chrome (Manifest V3) extension that disguises browser fingerprint surfaces behind one consistent environment. It presents a single fake identity coherently across JavaScript APIs and HTTP headers, so the values a fingerprinter reads in JS line up with the headers the browser actually sends.

Korean: [README.ko.md](README.ko.md)

## What it spoofs

Identity surfaces (JavaScript):
- navigator.userAgent, appVersion, platform, vendor
- navigator.userAgentData and getHighEntropyValues
- navigator.language, navigator.languages
- navigator.hardwareConcurrency, deviceMemory
- navigator.maxTouchPoints, navigator.webdriver
- navigator.plugins / mimeTypes (normalized to a canonical set)
- navigator.mediaDevices.enumerateDevices (device count and labels normalized)
- navigator.connection (effectiveType / rtt / downlink)
- navigator.storage.estimate (quota)
- navigator.keyboard.getLayoutMap (US layout)
- navigator.gpu adapter vendor (WebGPU)
- navigator.getBattery (normalized to charging / full)
- speechSynthesis.getVoices (voice list normalized)
- WebGL getSupportedExtensions / getShaderPrecisionFormat (normalized to the persona GPU family)
- screen dimensions, devicePixelRatio, isExtended, window.outerWidth/outerHeight, screenX/screenY
- WebGL unmasked vendor / renderer
- timezone: Intl.DateTimeFormat, Date.prototype.getTimezoneOffset, Date.prototype.toString / toLocaleString family (DST-aware, consistent with the persona timezone)

Anti-fingerprint noise:
- Canvas farbling: seeded perturbation of getImageData / toDataURL, and OffscreenCanvas (getImageData / convertToBlob)
- Audio farbling: AudioBuffer.getChannelData and AnalyserNode getFloat/ByteFrequencyData and TimeDomainData
- Font-metric farbling: value- and origin-keyed sub-pixel noise on getBoundingClientRect / measureText to disrupt font enumeration (the font set and rendering are left untouched)

Network:
- HTTP request headers rewritten via declarativeNetRequest: User-Agent, Accept-Language, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform
- WebRTC IP handling policy set to disable_non_proxied_udp to reduce local IP leakage

Hardening (close common bypasses):
- Spoofing is re-applied to dynamically created iframes via the contentWindow / contentDocument accessors
- Spoofing is injected into Web Workers — navigator, timezone, WebGL, and OffscreenCanvas in the worker realm (can be disabled per the toggle if a site breaks)
- Patched functions report native code through Function.prototype.toString
- Properties are defined on the owning prototype where possible to match native getter locations, and no detectable global marker is left on the page
- Individual persona values (timezone, languages, cores, memory, DPR) can be overridden from the options page

## How it works

Injection uses the chrome.userScripts API to run the spoofing code at document_start in the page's MAIN world. This puts the fake values in place before the page's own scripts read them, while still carrying a dynamic, per-persona configuration. The earlier approach of injecting from a navigation event was too slow and is kept only as a fallback.

HTTP header spoofing is handled separately by declarativeNetRequest dynamic rules so the headers match the JavaScript identity.

All configuration lives in chrome.storage.local. The service worker watches for changes and re-synchronizes the user script, the network rules, and the WebRTC policy.

Project structure:
```
src/
  background/sw.ts        service worker: userScripts, DNR, WebRTC sync
  inject/applyInPage.ts   self-contained spoofing routine (runs in MAIN world)
  core/personas.ts        persona profiles
  core/dnr.ts             declarativeNetRequest rule builder
  core/headers.ts         header value builders
  core/settings.ts        storage helpers
  popup/                  toolbar popup (React)
  options/                detailed settings page (React)
  types.ts                shared types, defaults, feature metadata
```

## Privacy

Masque is local-only. It does not send your data anywhere, has no analytics, and makes no network requests of its own. All settings are stored locally in the browser.

## License

MIT. Author: Huido Choo.
