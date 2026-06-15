import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type Settings } from '../types'
import { PRESETS } from '../core/personas'
import {
  getSettings,
  setSettings,
  hostOf,
  userScriptsAvailable,
  openExtensionDetails,
} from '../core/settings'

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer select-none">
      <span className="text-sm text-neutral-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-neutral-600'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}

export function App() {
  const [settings, setLocal] = useState<Settings>(DEFAULT_SETTINGS)
  const [host, setHost] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      setLocal(await getSettings())
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.url) setHost(hostOf(tab.url))
      } catch {
        void 0
      }
      setReady(true)
    })()
  }, [])

  const patch = async (p: Partial<Settings>) => {
    setLocal(await setSettings(p))
  }

  const excepted = host ? settings.exceptions.includes(host) : false
  const toggleException = (on: boolean) => {
    if (!host) return
    const exceptions = on
      ? [...new Set([...settings.exceptions, host])]
      : settings.exceptions.filter((e) => e !== host)
    void patch({ exceptions })
  }

  if (!ready) return <div className="w-72 bg-neutral-900 p-4 text-neutral-400">…</div>

  return (
    <div className="w-72 bg-neutral-900 p-4 text-neutral-100">
      {!userScriptsAvailable() && (
        <div className="mb-3 rounded-lg border border-amber-600/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <div className="font-semibold">User scripts are off</div>
          <p className="mt-1 text-amber-200/80">
            Masque cannot run until you enable “Allow user scripts” in this extension’s details.
          </p>
          <button
            type="button"
            onClick={openExtensionDetails}
            className="mt-2 rounded bg-amber-500/20 px-2 py-1 font-medium text-amber-100 hover:bg-amber-500/30"
          >
            Open extension details
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">Masque</h1>
        <Toggle
          label=""
          checked={settings.enabled}
          onChange={(v) => void patch({ enabled: v })}
        />
      </div>

      <label className="mb-1 block text-xs text-neutral-400">Persona</label>
      <select
        value={settings.activePersonaId}
        onChange={(e) => void patch({ activePersonaId: e.target.value })}
        className="mb-4 w-full rounded bg-neutral-800 px-2 py-1.5 text-sm outline-none"
      >
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      {host && (
        <div className="border-t border-neutral-800 pt-1">
          <Toggle
            label={`Disable on ${host}`}
            checked={excepted}
            onChange={toggleException}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => chrome.runtime.openOptionsPage()}
        className="mt-3 w-full rounded bg-neutral-800 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
      >
        Detailed settings…
      </button>
    </div>
  )
}
