import { ErrorBanner } from '../../common/units/ErrorBanner.tsx'
import { Skeleton } from '../../common/units/Skeleton.tsx'
import type { DailyPrice, Quote } from '../../domain/market-data/marketDataProvider.ts'
import type { Range, RangeKey } from './constants.ts'
import { PriceChart } from './PriceChart.tsx'
import { QuoteSummary } from './QuoteSummary.tsx'
import { VolumeChart } from './VolumeChart.tsx'

interface DashboardProps {
  symbols: readonly string[]
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
        <h1 className="m-0 text-2xl font-medium text-[var(--text-h)]">
          Ticker Stocks
        </h1>
        <div className="flex gap-1" role="tablist" aria-label="Ticker">
          {symbols.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === symbol}
              onClick={() => onSelectSymbol(s)}
              className={`rounded-md border px-3 py-1 text-sm ${
                s === symbol
                  ? 'border-[var(--accent)] text-[var(--text-h)]'
                  : 'border-[var(--border)]'
              }`}
            >
              {s}
            </button>
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
                        ? 'border-[var(--accent)] text-[var(--text-h)]'
                        : 'border-[var(--border)]'
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
