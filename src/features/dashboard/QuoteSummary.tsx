import type { Quote } from '../../domain/market-data/marketDataProvider.ts'

export function QuoteSummary({ quote }: { quote: Quote }) {
  const up = quote.change >= 0
  const sign = up ? '+' : ''
  return (
    <section className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h2 className="text-xl font-medium text-heading">
        {quote.symbol}
      </h2>
      <span className="text-3xl font-medium text-heading">
        ${quote.price.toFixed(2)}
      </span>
      <span className={up ? 'text-up' : 'text-down'}>
        {sign}
        {quote.change.toFixed(2)} ({sign}
        {quote.changePercent.toFixed(2)}%)
      </span>
      <span className="text-sm">as of {quote.latestTradingDay}</span>
    </section>
  )
}
