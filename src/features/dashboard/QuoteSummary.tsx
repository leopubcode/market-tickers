import type { Quote } from '../../domain/market-data/marketDataProvider.ts'

export function QuoteSummary({
  quote,
  name,
  change,
  changePercent,
  rangeLabel,
}: {
  quote: Quote
  name?: string
  change: number
  changePercent: number
  rangeLabel: string
}) {
  const up = change >= 0
  const sign = up ? '+' : ''
  return (
    <section className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-x-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-medium text-heading">
            {quote.symbol}
          </h2>
          {name && <span className="text-sm">{name}</span>}
        </div>
        <span className="text-3xl font-medium text-heading">
          ${quote.price.toFixed(2)}
        </span>
        <span className="text-sm">as of {quote.latestTradingDay}</span>
      </div>
      <div className={up ? 'text-up' : 'text-down'}>
        {rangeLabel}: {sign}
        {change.toFixed(2)} ({sign}
        {changePercent.toFixed(2)}%)
      </div>
    </section>
  )
}
