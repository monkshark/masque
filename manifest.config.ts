import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Masque',
  version: '1.0.0',
  description:
    'Spoof browser fingerprint surfaces with consistent personas. Local-only, best-effort.',
  minimum_chrome_version: '120',
  permissions: [
    'storage',
    'scripting',
    'userScripts',
    'declarativeNetRequest',
    'webNavigation',
    'privacy',
  ],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/sw.ts',
    type: 'module',
  },
  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    default_title: 'Masque',
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
})
