import type { DailyPrice } from '../../domain/market-data/marketDataProvider.ts'

/**
 * Prepends zero-valued weekdays from `start` up to the first real price, so a
 * ticker with a short history still spans the same time scale as the rest.
 * `prices` must be oldest first.
 */
export function padPrices(prices: DailyPrice[], start: string | undefined): DailyPrice[] {
  if (start === undefined || prices.length === 0 || start >= prices[0].date) return prices
  const padding: DailyPrice[] = []
  const d = new Date(`${start}T00:00:00Z`)
  for (let date = start; date < prices[0].date; ) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) {
      padding.push({ date, open: 0, high: 0, low: 0, close: 0, volume: 0 })
    }
    d.setUTCDate(d.getUTCDate() + 1)
    date = d.toISOString().slice(0, 10)
  }
  return [...padding, ...prices]
}
