import type { Quote } from '../../domain/market-data/marketDataProvider.ts'

export function QuoteSummary({ quote }: { quote: Quote }) {
  const up = quote.change >= 0
  const sign = up ? '+' : ''
  return (
    <section className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h2 className="m-0 text-xl font-medium text-[var(--text-h)]">
        {quote.symbol}
      </h2>
      <span className="text-3xl font-medium text-[var(--text-h)]">
        ${quote.price.toFixed(2)}
      </span>
      <span style={{ color: up ? 'var(--up)' : 'var(--down)' }}>
        {sign}
        {quote.change.toFixed(2)} ({sign}
        {quote.changePercent.toFixed(2)}%)
      </span>
      <span className="text-sm">as of {quote.latestTradingDay}</span>
    </section>
  )
}
