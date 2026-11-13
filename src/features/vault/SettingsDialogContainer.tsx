import { useState, type RefObject } from 'react'
import type { Settings } from '../../domain/settings/settings.ts'
import { useSession } from '../../session/SessionContext.tsx'
import { SettingsDialog } from './SettingsDialog.tsx'

export function SettingsDialogContainer({
  dialogRef,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>
}) {
  const { settings, saveSettings } = useSession()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  const save = async (next: Settings) => {
    setPending(true)
    setError(undefined)
    try {
      await saveSettings(next)
      dialogRef.current?.close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the settings.')
    } finally {
      setPending(false)
    }
  }

  return (
    <SettingsDialog
      dialogRef={dialogRef}
      settings={settings}
      pending={pending}
      error={error}
      onSave={(next) => void save(next)}
    />
  )
}
