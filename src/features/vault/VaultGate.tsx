import { useState, type ReactNode } from 'react'
import { MIN_PASSWORD_LENGTH } from '../../domain/vault/vaultRecord.ts'
import type { Settings } from '../../domain/settings/settings.ts'
import { SettingsVaultService, VAULT_ITERATIONS, type UnlockedVault } from '../../services/SettingsVaultService.ts'
import { LocalStorageSettingsVaultRepository } from '../../storage/SettingsVaultRepository/LocalStorageSettingsVaultRepository.ts'
import { SessionContext } from '../../session/SessionContext.tsx'
import { VaultDialog, type VaultSubmission } from './VaultDialog.tsx'

/**
 * Holds the app back until the settings vault is open. The decrypted settings and
 * the derived key live in this component's state only: locking, or closing the
 * page, discards them.
 */
export function VaultGate({ children }: { children: ReactNode }) {
  const [service] = useState(
    () =>
      new SettingsVaultService(
        new LocalStorageSettingsVaultRepository(localStorage),
        { iterations: VAULT_ITERATIONS },
        crypto,
      ),
  )
  const [hasVault, setHasVault] = useState(() => service.exists())
  const [vault, setVault] = useState<UnlockedVault | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  if (vault) {
    return (
      <SessionContext
        value={{
          settings: vault.settings,
          saveSettings: async (settings: Settings) => setVault(await service.save(vault, settings)),
          lock: () => {
            setError(undefined)
            setVault(null)
          },
        }}
      >
        {children}
      </SessionContext>
    )
  }

  const submit = async ({ password, confirmation, settings }: VaultSubmission) => {
    setError(undefined)
    if (!hasVault) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return setError(`The password needs at least ${MIN_PASSWORD_LENGTH} characters.`)
      }
      if (password !== confirmation) return setError('The passwords do not match.')
    }
    setPending(true)
    try {
      setVault(hasVault ? await service.unlock(password) : await service.create(password, settings))
      setHasVault(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the vault.')
    } finally {
      setPending(false)
    }
  }

  return (
    <VaultDialog
      mode={hasVault ? 'unlock' : 'create'}
      pending={pending}
      error={error}
      onSubmit={(submission) => void submit(submission)}
      onErase={() => {
        if (!confirm('Erase the encrypted settings, including the API key? This cannot be undone.')) return
        service.erase()
        setError(undefined)
        setHasVault(false)
      }}
    />
  )
}
