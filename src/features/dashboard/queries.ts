import { queryOptions } from '@tanstack/react-query'
import type { AssetKind } from '../../domain/market-data/marketDataProvider.ts'
import type { PriceCacheService } from '../../services/PriceCacheService.ts'
import type { WatchlistItem } from './constants.ts'

export const kindOf = (watchlist: readonly WatchlistItem[], symbol: string): AssetKind =>
  watchlist.find((w) => w.symbol === symbol)?.kind ?? 'stock'

/** Reads only the local cache; the provider is called when a cache build is approved. */
export const cacheQuery = (priceCache: PriceCacheService, symbol: string) =>
  queryOptions({
    queryKey: ['cache', symbol],
    queryFn: async () => (await priceCache.get(symbol)) ?? null,
    staleTime: Infinity,
  })
