import { createContext, use } from 'react'
import type { Settings } from '../domain/settings/settings.ts'

/** The unlocked vault as the app sees it: the decrypted settings and what can be done with them. */
export interface Session {
  settings: Settings
  /** Encrypts and stores new settings, then applies them. Rejects if the settings are invalid. */
  saveSettings: (settings: Settings) => Promise<void>
  /** Forgets the decrypted settings and asks for the password again. */
  lock: () => void
}

export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const session = use(SessionContext)
  if (!session) throw new Error('useSession must be used inside an unlocked vault')
  return session
}
