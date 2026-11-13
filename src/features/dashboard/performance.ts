import type { DailyPrice } from '../../domain/market-data/marketDataProvider.ts'
import { rangeStart, type Range } from './constants.ts'

/** Price change over the range, or undefined until quote and history are loaded. */
export function rangeChange(
  price: number | undefined,
  daily: readonly DailyPrice[] | undefined,
  range: Range,
  allStart: string | undefined,
) {
  if (price === undefined || !daily) return undefined
  // The provider returns newest first.
  const start = rangeStart(range, daily) ?? allStart
  const inRange = daily.filter((p) => start === undefined || p.date >= start)
  // Baseline is the last close before the range, or the first close in it.
  // Trading-day ranges already start on their baseline close.
  const baseline =
    ('tradingDays' in range
      ? undefined
      : daily.find((p) => start !== undefined && p.date < start)) ?? inRange.at(-1)
  if (!baseline) return undefined
  const change = price - baseline.close
  return { start, change, changePercent: (change / baseline.close) * 100 }
}
