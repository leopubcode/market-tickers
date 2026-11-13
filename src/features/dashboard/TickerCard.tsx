import { useQuery } from '@tanstack/react-query'
import { ErrorBanner } from '../../common/units/ErrorBanner.tsx'
import { Skeleton } from '../../common/units/Skeleton.tsx'
import { rangeStart, WATCHLIST, type Range } from './constants.ts'
import { padPrices } from './padPrices.ts'
import { rangeChange } from './performance.ts'
import { PriceChart } from './PriceChart.tsx'
import { dailyQuery, quoteQuery } from './queries.ts'
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
  const quote = useQuery(quoteQuery(symbol))
  const daily = useQuery(dailyQuery(symbol))

  const error = quote.error ?? daily.error
  const performance = rangeChange(quote.data?.price, daily.data, range, allStart)
  const change = performance?.change
  const changePercent = performance?.changePercent
  const start = daily.data ? (rangeStart(range, daily.data) ?? allStart) : undefined
  // The provider returns newest first; charts read oldest to newest.
  const prices = daily.data
    ? padPrices(
        daily.data
          .filter((p) => start === undefined || p.date >= start)
          .reverse(),
        start,
      )
    : undefined

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-md border border-line p-4">
      {error && <ErrorBanner message={error.message} />}
      {quote.isPending || daily.isPending ? (
        <>
          <Skeleton className="h-16" />
          <Skeleton className="h-64" />
        </>
      ) : (
        <>
          {quote.data && change !== undefined && changePercent !== undefined && (
            <QuoteSummary
              quote={quote.data}
              name={WATCHLIST.find((w) => w.symbol === symbol)?.name}
              change={change}
              changePercent={changePercent}
              rangeLabel={range.label}
            />
          )}
          {prices && (
            <PriceChart prices={prices} up={(change ?? 0) >= 0} />
          )}
        </>
      )}
    </article>
  )
}
