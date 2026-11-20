import type { AssetKind } from '../../domain/market-data/marketDataProvider.ts'
import type { WatchlistItem } from './constants.ts'

export const ASSET_KINDS: readonly AssetKind[] = ['stock', 'crypto', 'commodity']

export const isWatchlist = (v: unknown): v is WatchlistItem[] =>
  Array.isArray(v) &&
  v.every(
    (w) =>
      typeof w === 'object' &&
      w !== null &&
      typeof w.symbol === 'string' &&
      typeof w.name === 'string' &&
      (w.kind === undefined || ASSET_KINDS.includes(w.kind)),
  )

/** Returns the list unchanged when the symbol is blank or already watched. */
export function addToWatchlist(
  list: readonly WatchlistItem[],
  input: { symbol: string; name: string; kind: AssetKind },
): WatchlistItem[] {
  const symbol = input.symbol.trim().toUpperCase()
  if (!symbol || list.some((w) => w.symbol === symbol)) return [...list]
  const entry: WatchlistItem = { symbol, name: input.name.trim() || symbol }
  if (input.kind !== 'stock') entry.kind = input.kind
  return [...list, entry]
}
