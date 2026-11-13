import type { AssetKind, DailyPrice } from '../../domain/market-data/marketDataProvider.ts'
import { addDays, latestWeekday, weekdaysBack } from '../../domain/price-cache/calendar.ts'

type WatchlistEntry = { symbol: string; name: string; kind?: AssetKind }

export const WATCHLIST: readonly WatchlistEntry[] = [
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'AVGO', name: 'Broadcom Inc.' },
  { symbol: 'CRWV', name: 'CoreWeave, Inc.' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing Company (ADR)' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'SPCX', name: 'Space Exploration Technologies Corp. (SpaceX)' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)' },
  { symbol: 'META', name: 'Meta Platforms, Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'MU', name: 'Micron Technology, Inc.' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
  { symbol: 'MSTR', name: 'Strategy Inc. (MicroStrategy)' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq-100)' },
  { symbol: 'BTC', name: 'Bitcoin (USD)', kind: 'crypto' },
  { symbol: 'XAU', name: 'Gold spot (USD per troy oz)', kind: 'commodity' },
  { symbol: 'XAG', name: 'Silver spot (USD per troy oz)', kind: 'commodity' },
  { symbol: 'WTI', name: 'Crude oil, WTI (USD per barrel)', kind: 'commodity' },
]

export type WatchlistItem = WatchlistEntry

export const RANGES = [
  { key: '1D', label: '1D', tradingDays: 1 },
  { key: '3D', label: '3D', tradingDays: 3 },
  { key: '5D', label: '5D', tradingDays: 5 },
  { key: '7D', label: '7D', tradingDays: 7 },
  { key: '1M', label: '1M', months: 1 },
  { key: '3M', label: '3M', months: 3 },
  { key: '6M', label: '6M', months: 6 },
  { key: 'YTD', label: 'YTD', ytd: true },
  { key: '1Y', label: '1Y', months: 12 },
  { key: '3Y', label: '3Y', months: 36 },
  { key: '5Y', label: '5Y', months: 60 },
  { key: '10Y', label: '10Y', months: 120 },
  { key: 'ALL', label: 'All' },
] as const

export type Range = (typeof RANGES)[number]
export type RangeKey = Range['key']

/**
 * First date (YYYY-MM-DD) included in the range, or undefined for all time.
 * `prices` is newest first. Trading-day ranges start N sessions back, so the
 * chart includes the close that the change is measured against.
 */
export function rangeStart(range: Range, prices: readonly DailyPrice[]): string | undefined {
  if (prices.length === 0) return undefined
  const latestDate = prices[0].date
  if ('tradingDays' in range) return prices[Math.min(range.tradingDays, prices.length - 1)].date
  if ('ytd' in range) return `${latestDate.slice(0, 4)}-01-01`
  if (!('months' in range)) return undefined
  const d = new Date(`${latestDate}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - range.months)
  return d.toISOString().slice(0, 10)
}

/**
 * Oldest day the cache must hold for the range, or null for all history. A few
 * days of slack keep the close before the range, which the change is measured from.
 */
export function requestedStart(range: Range, today: string): string | null {
  if ('tradingDays' in range) {
    return addDays(weekdaysBack(latestWeekday(today), range.tradingDays), -5)
  }
  if ('ytd' in range) return addDays(`${today.slice(0, 4)}-01-01`, -5)
  if (!('months' in range)) return null
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - range.months)
  return addDays(d.toISOString().slice(0, 10), -5)
}

export const GRID_COLUMNS = [1, 2, 3, 4, 5, 6] as const

export type GridColumns = (typeof GRID_COLUMNS)[number]
