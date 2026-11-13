import { queryOptions } from '@tanstack/react-query'
import type { AssetKind } from '../../domain/market-data/marketDataProvider.ts'
import { priceCache } from '../../priceCache.ts'
import { WATCHLIST } from './constants.ts'

export const kindOf = (symbol: string): AssetKind =>
  WATCHLIST.find((w) => w.symbol === symbol)?.kind ?? 'stock'

/** Reads only the local cache; the provider is called when a cache build is approved. */
export const cacheQuery = (symbol: string) =>
  queryOptions({
    queryKey: ['cache', symbol],
    queryFn: async () => (await priceCache.get(symbol)) ?? null,
    staleTime: Infinity,
  })
