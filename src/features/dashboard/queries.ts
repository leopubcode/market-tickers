import { queryOptions } from '@tanstack/react-query'
import type { AssetKind } from '../../domain/market-data/marketDataProvider.ts'
import { marketData } from '../../marketData.ts'
import { WATCHLIST } from './constants.ts'

const kindOf = (symbol: string): AssetKind =>
  WATCHLIST.find((w) => w.symbol === symbol)?.kind ?? 'stock'

export const quoteQuery = (symbol: string) =>
  queryOptions({
    queryKey: ['quote', symbol],
    queryFn: () => marketData.getQuote(symbol, kindOf(symbol)),
  })

export const dailyQuery = (symbol: string) =>
  queryOptions({
    queryKey: ['daily', symbol],
    queryFn: () => marketData.getDailyPrices(symbol, { kind: kindOf(symbol), outputSize: 'full' }),
  })
