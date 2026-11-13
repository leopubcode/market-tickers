export const WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'KO', 'SPY'] as const

// Alpha Vantage's compact daily series holds ~100 trading days.
export const RANGES = [
  { key: '1M', label: '1M', days: 21 },
  { key: '3M', label: '3M', days: 63 },
  { key: 'MAX', label: 'Max', days: 100 },
] as const

export type Range = (typeof RANGES)[number]
export type RangeKey = Range['key']
