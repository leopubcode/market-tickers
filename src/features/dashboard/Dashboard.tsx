import { ErrorBanner } from '../../common/units/ErrorBanner.tsx'
import { Skeleton } from '../../common/units/Skeleton.tsx'
import { Tooltip } from '../../common/units/Tooltip.tsx'
import type { DailyPrice, Quote } from '../../domain/market-data/marketDataProvider.ts'
import type { Range, RangeKey, WatchlistItem } from './constants.ts'
import { PriceChart } from './PriceChart.tsx'
import { QuoteSummary } from './QuoteSummary.tsx'
import { VolumeChart } from './VolumeChart.tsx'

interface DashboardProps {
  symbols: readonly WatchlistItem[]
  symbol: string
  onSelectSymbol: (symbol: string) => void
  ranges: readonly Range[]
  range: Range
  onSelectRange: (key: RangeKey) => void
  quote?: Quote
  prices?: DailyPrice[]
  loading: boolean
  error?: string
}

export function Dashboard({
  symbols,
  symbol,
  onSelectSymbol,
  ranges,
  range,
  onSelectRange,
  quote,
  prices,
  loading,
  error,
}: DashboardProps) {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-heading">
          Ticker Stocks
        </h1>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Ticker">
          {symbols.map((s) => (
            <Tooltip key={s.symbol} content={s.name}>
              {(trigger) => (
                <button
                  {...trigger}
                  type="button"
                  role="tab"
                  aria-selected={s.symbol === symbol}
                  onClick={() => onSelectSymbol(s.symbol)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    s.symbol === symbol
                      ? 'border-accent text-heading'
                      : 'border-line'
                  }`}
                >
                  {s.symbol}
                </button>
              )}
            </Tooltip>
          ))}
        </div>
      </header>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <>
          <Skeleton className="h-20" />
          <Skeleton className="h-72" />
          <Skeleton className="h-24" />
        </>
      ) : (
        <>
          {quote && <QuoteSummary quote={quote} />}
          {prices && (
            <section className="flex flex-col gap-2">
              <div className="flex justify-end gap-1">
                {ranges.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={r.key === range.key}
                    onClick={() => onSelectRange(r.key)}
                    className={`rounded-md border px-2 py-0.5 text-xs ${
                      r.key === range.key
                        ? 'border-accent text-heading'
                        : 'border-line'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <PriceChart prices={prices} />
              <VolumeChart prices={prices} />
            </section>
          )}
        </>
      )}
    </main>
  )
}
