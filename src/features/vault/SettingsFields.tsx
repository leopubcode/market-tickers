import { useState } from 'react'
import { LIVE_SOURCES, SOURCE_LABELS, type LiveSource } from '../../config.ts'
import type { Settings } from '../../domain/settings/settings.ts'

const FIELD = 'rounded-md border border-line bg-page px-2 py-1 text-heading'

/** Uncontrolled inputs, read with `readSettingsForm` when the surrounding form submits. */
export function SettingsFields({ defaults }: { defaults: Settings }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Source
        <select name="source" defaultValue={defaults.source} className={FIELD}>
          <option value="mock">Mock (generated prices, no network)</option>
          {LIVE_SOURCES.map((source) => (
            <option key={source} value={source}>
              Live ({SOURCE_LABELS[source]})
            </option>
          ))}
        </select>
      </label>
      {LIVE_SOURCES.map((source) => (
        <ApiKeyField key={source} source={source} defaultValue={defaults.apiKeys[source]} />
      ))}
      <label className="flex items-start gap-2 text-sm">
        <input name="premium" type="checkbox" defaultChecked={defaults.premium} className="mt-1" />
        <span>
          Alpha Vantage premium plan
          <span className="block text-xs">
            Unlocks full stock history. Without it, stocks only reach back ~100 trading days.
            Twelve Data serves up to ~20 years on every plan.
          </span>
        </span>
      </label>
    </>
  )
}

function ApiKeyField({ source, defaultValue }: { source: LiveSource; defaultValue: string }) {
  // Only affects how the key is drawn, so it stays local to the field.
  const [revealed, setRevealed] = useState(false)
  return (
    <label className="flex flex-col gap-1 text-sm">
      {SOURCE_LABELS[source]} API key
      <span className="flex gap-2">
        <input
          name={`apiKey.${source}`}
          type={revealed ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          defaultValue={defaultValue}
          className={`${FIELD} min-w-0 flex-1`}
        />
        <button
          type="button"
          aria-pressed={revealed}
          onClick={() => setRevealed((v) => !v)}
          className="rounded-md border border-line px-2 text-xs"
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
      </span>
      <span className="text-xs">Required when {SOURCE_LABELS[source]} is the selected source.</span>
    </label>
  )
}
