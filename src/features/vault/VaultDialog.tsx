import { ErrorBanner } from '../../common/units/ErrorBanner.tsx'
import { DEFAULT_SETTINGS, type Settings } from '../../domain/settings/settings.ts'
import { MIN_PASSWORD_LENGTH } from '../../domain/vault/vaultRecord.ts'
import { readSettingsForm } from './readSettingsForm.ts'
import { SettingsFields } from './SettingsFields.tsx'

export interface VaultSubmission {
  password: string
  confirmation: string
  settings: Settings
}

interface VaultDialogProps {
  /** `create` on first use, `unlock` once a vault exists. */
  mode: 'create' | 'unlock'
  pending: boolean
  error?: string
  onSubmit: (submission: VaultSubmission) => void
  onErase: () => void
}

const FIELD = 'rounded-md border border-line bg-page px-2 py-1 text-heading'

/** Blocks the app until the vault is open; it cannot be dismissed. */
export function VaultDialog({ mode, pending, error, onSubmit, onErase }: VaultDialogProps) {
  const creating = mode === 'create'
  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal()
      }}
      onCancel={(e) => e.preventDefault()}
      aria-labelledby="vault-title"
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-md border border-line bg-page p-0 text-body backdrop:bg-black/50"
    >
      <form
        className="flex flex-col gap-3 p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          onSubmit({
            password: String(data.get('password') ?? ''),
            confirmation: String(data.get('confirmation') ?? ''),
            settings: readSettingsForm(data),
          })
        }}
      >
        <h2 id="vault-title" className="text-lg font-medium text-heading">
          {creating ? 'Set up your settings vault' : 'Unlock settings'}
        </h2>
        <p className="text-xs">
          {creating
            ? 'Your settings are encrypted in this browser with a password only you know. There is no way to recover it.'
            : 'Enter your password to decrypt your settings. They stay in memory only while this page is open.'}
        </p>

        {error && <ErrorBanner message={error} />}

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={creating ? MIN_PASSWORD_LENGTH : undefined}
            autoComplete={creating ? 'new-password' : 'current-password'}
            autoFocus
            className={FIELD}
          />
          {creating && <span className="text-xs">At least {MIN_PASSWORD_LENGTH} characters.</span>}
        </label>

        {creating && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Confirm password
              <input
                name="confirmation"
                type="password"
                required
                autoComplete="new-password"
                className={FIELD}
              />
            </label>
            <SettingsFields defaults={DEFAULT_SETTINGS} />
          </>
        )}

        <div className="flex items-center justify-between gap-4">
          {!creating ? (
            <button
              type="button"
              disabled={pending}
              onClick={onErase}
              className="text-xs underline disabled:opacity-50"
            >
              Forgot it? Erase the vault
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-accent px-3 py-1 text-sm text-heading disabled:opacity-50"
          >
            {pending ? 'Working…' : creating ? 'Create vault' : 'Unlock'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
