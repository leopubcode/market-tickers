import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { marketData } from '../../marketData.ts'
import { Dashboard } from './Dashboard.tsx'
import { RANGES, WATCHLIST, type RangeKey } from './constants.ts'

export default function DashboardPage() {
  const [symbol, setSymbol] = useState<string>(WATCHLIST[0])
  const [rangeKey, setRangeKey] = useState<RangeKey>('3M')

  const quote = useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => marketData.getQuote(symbol),
  })
  const daily = useQuery({
    queryKey: ['daily', symbol],
    queryFn: () => marketData.getDailyPrices(symbol),
  })

  const range = RANGES.find((r) => r.key === rangeKey)!
  // The provider returns newest first; charts read oldest to newest.
  const prices = daily.data?.slice(0, range.days).reverse()
  const error = quote.error ?? daily.error

  return (
    <Dashboard
      symbols={WATCHLIST}
      symbol={symbol}
      onSelectSymbol={setSymbol}
      ranges={RANGES}
      range={range}
      onSelectRange={setRangeKey}
      quote={quote.data}
      prices={prices}
      loading={quote.isPending || daily.isPending}
      error={error ? error.message : undefined}
    />
  )
}
