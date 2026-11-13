import type { Settings } from '../../domain/settings/settings.ts'

/** Reads the fields rendered by `SettingsFields`. */
export function readSettingsForm(data: FormData): Settings {
  return {
    source: data.get('source') === 'live' ? 'live' : 'mock',
    apiKey: String(data.get('apiKey') ?? ''),
    premium: data.get('premium') === 'on',
  }
}
