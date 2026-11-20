import type { RefObject } from 'react'
import { ErrorBanner } from '../../common/units/ErrorBanner.tsx'
import type { Settings } from '../../domain/settings/settings.ts'
import { readSettingsForm } from './readSettingsForm.ts'
import { SettingsFields } from './SettingsFields.tsx'

interface SettingsDialogProps {
  /** Opened from the sidebar menu. */
  dialogRef: RefObject<HTMLDialogElement | null>
  settings: Settings
  pending: boolean
  error?: string
  onSave: (settings: Settings) => void
}

export function SettingsDialog({ dialogRef, settings, pending, error, onSave }: SettingsDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="settings-title"
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-md border border-line bg-page p-0 text-body backdrop:bg-black/50"
    >
      {/* Remounted on save so the inputs show the stored values. */}
      <form
        key={`${settings.source}|${settings.apiKeys.alphavantage}|${settings.apiKeys.twelvedata}|${settings.premium}`}
        className="flex flex-col gap-3 p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(readSettingsForm(new FormData(e.currentTarget)))
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="settings-title" className="text-lg font-medium text-heading">
            Settings
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-md border border-line px-2 py-0.5 text-xs"
          >
            Close
          </button>
        </div>
        <p className="text-xs">
          Stored encrypted in this browser. Each source keeps its own price cache, so switching
          never mixes prices from different providers.
        </p>

        {error && <ErrorBanner message={error} />}
        <SettingsFields defaults={settings} />

        <button
          type="submit"
          disabled={pending}
          className="self-end rounded-md border border-accent px-3 py-1 text-sm text-heading disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </dialog>
  )
}
