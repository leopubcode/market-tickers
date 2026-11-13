import { useState } from 'react'

function read<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function usePersistedState<T>(
  key: string,
  fallback: T,
  isValid: (v: unknown) => v is T,
) {
  const [value, setValue] = useState<T>(() => read(key, fallback, isValid))

  const set = (next: T | ((cur: T) => T)) => {
    const resolved = typeof next === 'function' ? (next as (cur: T) => T)(value) : next
    setValue(resolved)
    try {
      localStorage.setItem(key, JSON.stringify(resolved))
    } catch {
      // Storage unavailable or full; the preference just won't persist.
    }
  }

  return [value, set] as const
}
