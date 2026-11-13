import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '../../common/units/Skeleton.tsx'
import { findGaps } from '../../domain/price-cache/fetchPlan.ts'
import { deriveQuote, hasFullHistory } from '../../domain/price-cache/priceCache.ts'
import { priceCache } from '../../priceCache.ts'
import { rangeStart, requestedStart, WATCHLIST, type Range } from './constants.ts'
import { padPrices } from './padPrices.ts'
import { rangeChange } from './performance.ts'
import { PriceChart } from './PriceChart.tsx'
import { cacheQuery, kindOf } from './queries.ts'
import { QuoteSummary } from './QuoteSummary.tsx'

export function TickerCard({
  symbol,
  range,
  allStart,
}: {
  symbol: string
  range: Range
  /** Earliest date across all shown tickers; the scale for the All range. */
  allStart?: string
}) {
  const cache = useQuery(cacheQuery(symbol))
  const entry = cache.data
  const daily = entry?.prices
  const name = WATCHLIST.find((w) => w.symbol === symbol)?.name

  const quote = daily && deriveQuote(symbol, daily)
  const performance = rangeChange(quote?.price, daily, range, allStart)
  const change = performance?.change
  const changePercent = performance?.changePercent
  const start = daily ? (rangeStart(range, daily) ?? allStart) : undefined
  // Only a fully cached history can be padded: otherwise a gap is missing data, not a later listing.
  const complete = entry ? hasFullHistory(entry) : false
  const today = priceCache.today()
  const gapped =
    entry !== undefined &&
    entry !== null &&
    findGaps({ entry, kind: kindOf(symbol), start: requestedStart(range, today), today }).length > 0
  // The cache keeps newest first; charts read oldest to newest.
  const prices = daily
    ? (complete ? padPrices : (p: typeof daily) => p)(
        daily.filter((p) => start === undefined || p.date >= start).reverse(),
        start,
      )
    : undefined

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-md border border-line p-4">
      {cache.isPending ? (
        <>
          <Skeleton className="h-16" />
          <Skeleton className="h-64" />
        </>
      ) : !entry ? (
        <div className="flex flex-col">
          <h2 className="text-xl font-medium text-heading">{symbol}</h2>
          {name && <span className="text-sm">{name}</span>}
          <p className="mt-3 text-sm">Not cached yet. Approve its fetch in the cache report.</p>
        </div>
      ) : (
        <>
          {quote && change !== undefined && changePercent !== undefined && (
            <QuoteSummary
              quote={quote}
              name={name}
              change={change}
              changePercent={changePercent}
              rangeLabel={range.label}
            />
          )}
          {gapped && (
            <p className="text-xs">
              Some days in this range are not cached yet.
            </p>
          )}
          {prices && <PriceChart prices={prices} up={(change ?? 0) >= 0} />}
        </>
      )}
    </article>
  )
}
