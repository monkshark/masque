import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SETTINGS,
  DEFAULT_FEATURES,
  FEATURE_META,
  type Settings,
  type FeatureFlags,
  type FeatureMeta,
} from '../types'
import { PRESETS, personaById, resolvePersona } from '../core/personas'
import { getSettings, setSettings, userScriptsAvailable, openExtensionDetails } from '../core/settings'
import type { PersonaOverrides, Persona } from '../types'

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
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
  )
}

const GROUPS: { id: FeatureMeta['group']; title: string; note?: string }[] = [
  { id: 'identity', title: 'Identity surfaces', note: 'JS values read by fingerprinters. Keep these aligned with the persona.' },
  { id: 'noise', title: 'Anti-fingerprint noise', note: 'Seeded perturbation so canvas/audio hashes are not stable trackers.' },
  { id: 'hardening', title: 'Hardening', note: 'Close bypass paths. Workers may break some sites — toggle off if so.' },
  { id: 'network', title: 'Network', note: 'HTTP-level spoofing. Headers must match the JS User-Agent.' },
]

export function App() {
  const [settings, setLocal] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const [savedAt, setSavedAt] = useState(0)

  useEffect(() => {
    void (async () => {
      setLocal(await getSettings())
      setReady(true)
    })()
  }, [])

  const save = async (patch: Partial<Settings>) => {
    const next = await setSettings(patch)
    setLocal(next)
    setSavedAt((n) => n + 1)
  }

  const setFeature = (key: keyof FeatureFlags, value: boolean) =>
    void save({ features: { ...settings.features, [key]: value } })

  const basePersona = personaById(settings.activePersonaId) ?? PRESETS[0]
  const persona = resolvePersona(basePersona, settings.overrides)

  if (!ready) {
    return <div className="min-h-screen bg-neutral-950 p-10 text-neutral-400">…</div>
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Masque</h1>
            <p className="text-sm text-neutral-400">Fingerprint cloak — detailed settings</p>
          </div>
          <label className="flex items-center gap-3 rounded-lg bg-neutral-900 px-4 py-2">
            <span className="text-sm">{settings.enabled ? 'Enabled' : 'Disabled'}</span>
            <Switch checked={settings.enabled} onChange={(v) => void save({ enabled: v })} />
          </label>
        </header>

        {!userScriptsAvailable() && (
          <div className="mb-6 rounded-xl border border-amber-600/40 bg-amber-500/10 p-5 text-sm text-amber-200">
            <div className="font-semibold">User scripts are disabled</div>
            <p className="mt-1 text-amber-200/80">
              Masque injects its spoofing at document start through the userScripts API, which Chrome
              gates behind a per-extension switch. Until you turn on “Allow user scripts” in this
              extension’s details page, JavaScript surfaces will not be spoofed.
            </p>
            <button
              type="button"
              onClick={openExtensionDetails}
              className="mt-3 rounded bg-amber-500/20 px-3 py-1.5 font-medium text-amber-100 hover:bg-amber-500/30"
            >
              Open extension details
            </button>
          </div>
        )}

        <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Persona
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PRESETS.map((pr) => (
              <button
                key={pr.id}
                type="button"
                onClick={() => void save({ activePersonaId: pr.id })}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  pr.id === settings.activePersonaId
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-neutral-700 hover:border-neutral-500'
                }`}
              >
                {pr.label}
              </button>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            {[
              ['User-Agent', persona.ua],
              ['Platform', persona.platform],
              ['Languages', persona.languages.join(', ')],
              ['Screen', `${persona.screen.width}×${persona.screen.height} @${persona.devicePixelRatio}x`],
              ['WebGL', persona.webgl.renderer],
              ['Timezone', persona.timezone],
              ['Cores / Memory', `${persona.hardwareConcurrency} / ${persona.deviceMemory} GB`],
              ['Touch points', String(persona.maxTouchPoints)],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2 border-b border-neutral-800/60 py-1">
                <dt className="w-28 shrink-0 text-neutral-500">{k}</dt>
                <dd className="break-all font-mono text-neutral-300">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Overrides
          base={basePersona}
          overrides={settings.overrides}
          onChange={(overrides) => void save({ overrides })}
        />

        {GROUPS.map((g) => (
          <section key={g.id} className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              {g.title}
            </h2>
            {g.note && <p className="mt-1 mb-3 text-xs text-neutral-500">{g.note}</p>}
            <div className="divide-y divide-neutral-800">
              {FEATURE_META.filter((f) => f.group === g.id).map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm text-neutral-200">{f.label}</div>
                    <div className="text-xs text-neutral-500">{f.description}</div>
                  </div>
                  <Switch
                    checked={settings.features[f.key]}
                    onChange={(v) => setFeature(f.key, v)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Noise seed
          </h2>
          <p className="mb-3 text-xs text-neutral-500">
            Canvas/audio noise is deterministic per seed. Change it to rotate your noise profile.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={settings.seed}
              onChange={(e) => void save({ seed: Number(e.target.value) || 0 })}
              className="w-40 rounded bg-neutral-800 px-3 py-1.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => void save({ seed: Math.floor(Math.random() * 2 ** 31) })}
              className="rounded bg-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-600"
            >
              Randomize
            </button>
          </div>
        </section>

        <Exceptions
          exceptions={settings.exceptions}
          onChange={(exceptions) => void save({ exceptions })}
        />

        <footer className="mt-8 flex items-center justify-between text-xs text-neutral-500">
          <button
            type="button"
            onClick={() => void save({ ...DEFAULT_SETTINGS, features: { ...DEFAULT_FEATURES } })}
            className="rounded border border-neutral-700 px-3 py-1.5 hover:border-neutral-500"
          >
            Reset to defaults
          </button>
          <span>{savedAt > 0 ? 'Saved' : ''}</span>
        </footer>
      </div>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-neutral-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-52 rounded bg-neutral-800 px-2 py-1 text-sm outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

const LOCALE_PRESETS: { tag: string; label: string; list: string[] }[] = [
  { tag: 'en-US', label: 'English (US)', list: ['en-US', 'en'] },
  { tag: 'en-GB', label: 'English (UK)', list: ['en-GB', 'en'] },
  { tag: 'ko-KR', label: 'Korean', list: ['ko-KR', 'ko', 'en-US', 'en'] },
  { tag: 'ja-JP', label: 'Japanese', list: ['ja-JP', 'ja', 'en-US', 'en'] },
  { tag: 'zh-CN', label: 'Chinese (Simplified)', list: ['zh-CN', 'zh', 'en-US', 'en'] },
  { tag: 'de-DE', label: 'German', list: ['de-DE', 'de', 'en-US', 'en'] },
  { tag: 'fr-FR', label: 'French', list: ['fr-FR', 'fr', 'en-US', 'en'] },
  { tag: 'es-ES', label: 'Spanish', list: ['es-ES', 'es', 'en-US', 'en'] },
  { tag: 'pt-BR', label: 'Portuguese (Brazil)', list: ['pt-BR', 'pt', 'en-US', 'en'] },
  { tag: 'ru-RU', label: 'Russian', list: ['ru-RU', 'ru', 'en-US', 'en'] },
]

const CORE_OPTIONS = [2, 4, 6, 8, 10, 12, 16, 20, 24]
const MEMORY_OPTIONS = [0.5, 1, 2, 4, 8]
const DPR_OPTIONS = [1, 1.25, 1.5, 2, 2.625, 3]

function Overrides({
  base,
  overrides,
  onChange,
}: {
  base: Persona
  overrides: PersonaOverrides
  onChange: (v: PersonaOverrides) => void
}) {
  const timezones = useMemo<string[]>(() => {
    try {
      const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
      if (sv) return sv('timeZone')
    } catch {
      void 0
    }
    return [base.timezone]
  }, [base.timezone])

  const set = (patch: PersonaOverrides) => {
    const next: PersonaOverrides = { ...overrides, ...patch }
    for (const k of Object.keys(next) as (keyof PersonaOverrides)[]) {
      const v = next[k]
      if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete next[k]
    }
    onChange(next)
  }

  const numOpts = (vals: number[], def: number, unit = '') => [
    { value: '', label: `default (${def}${unit})` },
    ...vals.map((n) => ({ value: String(n), label: n + unit })),
  ]

  const langValue = overrides.languages ? overrides.languages[0] : ''

  return (
    <section className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Overrides</h2>
      <p className="mt-1 mb-3 text-xs text-neutral-500">
        Pick individual values on top of the selected persona. Only valid, plausible values are
        offered. Leave on "(persona default)" to keep the persona value.
      </p>
      <div className="divide-y divide-neutral-800">
        <Select
          label="Timezone"
          value={overrides.timezone ?? ''}
          onChange={(v) => set({ timezone: v })}
          options={[
            { value: '', label: `default (${base.timezone})` },
            ...timezones.map((t) => ({ value: t, label: t })),
          ]}
        />
        <Select
          label="Languages"
          value={langValue}
          onChange={(v) => {
            const preset = LOCALE_PRESETS.find((l) => l.tag === v)
            set({ languages: preset ? preset.list : undefined })
          }}
          options={[
            { value: '', label: `default (${base.languages.join(', ')})` },
            ...LOCALE_PRESETS.map((l) => ({ value: l.tag, label: l.label })),
          ]}
        />
        <Select
          label="CPU cores"
          value={overrides.hardwareConcurrency != null ? String(overrides.hardwareConcurrency) : ''}
          onChange={(v) => set({ hardwareConcurrency: v ? Number(v) : undefined })}
          options={numOpts(CORE_OPTIONS, base.hardwareConcurrency)}
        />
        <Select
          label="Device memory"
          value={overrides.deviceMemory != null ? String(overrides.deviceMemory) : ''}
          onChange={(v) => set({ deviceMemory: v ? Number(v) : undefined })}
          options={numOpts(MEMORY_OPTIONS, base.deviceMemory, ' GB')}
        />
        <Select
          label="Device pixel ratio"
          value={overrides.devicePixelRatio != null ? String(overrides.devicePixelRatio) : ''}
          onChange={(v) => set({ devicePixelRatio: v ? Number(v) : undefined })}
          options={numOpts(DPR_OPTIONS, base.devicePixelRatio, 'x')}
        />
      </div>
      {Object.keys(overrides).length > 0 && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="mt-3 rounded border border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-500"
        >
          Clear overrides
        </button>
      )}
    </section>
  )
}

function Exceptions({
  exceptions,
  onChange,
}: {
  exceptions: string[]
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const host = input.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!host) return
    if (!exceptions.includes(host)) onChange([...exceptions, host])
    setInput('')
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Exceptions
      </h2>
      <p className="mb-3 text-xs text-neutral-500">
        Domains where Masque stays off (subdomains included).
      </p>
      <div className="mb-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
          placeholder="example.com"
          className="flex-1 rounded bg-neutral-800 px-3 py-1.5 text-sm outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="rounded bg-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-600"
        >
          Add
        </button>
      </div>
      {exceptions.length === 0 ? (
        <p className="text-xs text-neutral-600">No exceptions.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {exceptions.map((e) => (
            <li
              key={e}
              className="flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-1 text-xs"
            >
              <span className="font-mono">{e}</span>
              <button
                type="button"
                onClick={() => onChange(exceptions.filter((x) => x !== e))}
                className="text-neutral-500 hover:text-red-400"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
