export const WATCHLIST = [
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
] as const

export type WatchlistItem = (typeof WATCHLIST)[number]

// Alpha Vantage's compact daily series holds ~100 trading days.
export const RANGES = [
  { key: '1M', label: '1M', days: 21 },
  { key: '3M', label: '3M', days: 63 },
  { key: 'MAX', label: 'Max', days: 100 },
] as const

export type Range = (typeof RANGES)[number]
export type RangeKey = Range['key']
