import { LIVE_SOURCES, type LiveSource, type MarketDataSource } from '../../config.ts'
import type { Settings } from '../../domain/settings/settings.ts'

/** Reads the fields rendered by `SettingsFields`. */
export function readSettingsForm(data: FormData): Settings {
  const source = String(data.get('source'))
  return {
    source: LIVE_SOURCES.includes(source as LiveSource) ? (source as MarketDataSource) : 'mock',
    apiKeys: {
      alphavantage: String(data.get('apiKey.alphavantage') ?? ''),
      twelvedata: String(data.get('apiKey.twelvedata') ?? ''),
    },
    premium: data.get('premium') === 'on',
  }
}
