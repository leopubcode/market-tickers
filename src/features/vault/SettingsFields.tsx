import { useState } from 'react'
import type { Settings } from '../../domain/settings/settings.ts'

const FIELD = 'rounded-md border border-line bg-page px-2 py-1 text-heading'

/** Uncontrolled inputs, read with `readSettingsForm` when the surrounding form submits. */
export function SettingsFields({ defaults }: { defaults: Settings }) {
  // Only affects how the key is drawn, so it stays local to the field.
  const [revealed, setRevealed] = useState(false)
  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Source
        <select name="source" defaultValue={defaults.source} className={FIELD}>
          <option value="mock">Mock (generated prices, no network)</option>
          <option value="live">Live (Alpha Vantage)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Alpha Vantage API key
        <span className="flex gap-2">
          <input
            name="apiKey"
            type={revealed ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            defaultValue={defaults.apiKey}
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
        <span className="text-xs">Required for the live source.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input name="premium" type="checkbox" defaultChecked={defaults.premium} className="mt-1" />
        <span>
          Premium plan
          <span className="block text-xs">
            Unlocks full stock history. Without it, stocks only reach back ~100 trading days.
          </span>
        </span>
      </label>
    </>
  )
}
