import { addDays } from "./calendar.ts";
import type { DailyPrice, Quote } from "../market-data/marketDataProvider.ts";

/** Rows in a `compact` daily series; the provider's cut-off for the short call. */
export const COMPACT_LENGTH = 100;

export type OutputSize = "compact" | "full";

/** Days whose prices are cached and final; `from` is null once the history starts here. */
export interface CoveredRange {
  from: string | null;
  to: string;
}

/**
 * Everything cached for one symbol. Every fetch reaches up to the day before it
 * ran, so `covered` grows by a range ending there; ranges are sorted and never touch.
 */
export interface CacheEntry {
  symbol: string;
  /** Newest first. */
  prices: DailyPrice[];
  covered: CoveredRange[];
  /** ISO timestamp of the latest fetch. Its own day is provisional until the next one. */
  fetchedAt: string;
}

/** The covered ranges as of `today`, counting the provisional day of a fetch made today. */
export function coveredAsOf(entry: CacheEntry, today: string): CoveredRange[] {
  const last = entry.covered[entry.covered.length - 1];
  const fetchDay = entry.fetchedAt.slice(0, 10);
  if (!last || fetchDay !== today || last.to !== addDays(fetchDay, -1)) return entry.covered;
  return [...entry.covered.slice(0, -1), { ...last, to: today }];
}

export const hasFullHistory = (entry: CacheEntry) => entry.covered[0]?.from === null;

/**
 * Folds a fetch result into the entry, but only for the approved ranges: the
 * provider returns more days than were asked for, and the rest is dropped so
 * the cache holds exactly what was approved.
 */
export function applyFetch(
  entry: CacheEntry | undefined,
  fetched: readonly DailyPrice[],
  options: {
    symbol: string;
    fetchedAt: string;
    ranges: readonly { from: string | null; to: string }[];
    /** Whether a range reaches the latest day, so the fetch also refreshed the tail. */
    touchesTail: boolean;
  },
): CacheEntry {
  const inRanges = (date: string) =>
    options.ranges.some((r) => (r.from === null || date >= r.from) && date <= r.to);
  const byDate = new Map((entry?.prices ?? []).map((p) => [p.date, p]));
  for (const p of fetched) if (inRanges(p.date)) byDate.set(p.date, p);
  const prices = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));

  // The day of the fetch itself is provisional, so only the days before it are final.
  const finalThrough = addDays(options.fetchedAt.slice(0, 10), -1);
  const added: CoveredRange[] = options.ranges
    .map((r) => ({ from: r.from, to: r.to < finalThrough ? r.to : finalThrough }))
    .filter((r) => r.from === null || r.from <= r.to);

  const sorted = [...(entry?.covered ?? []), ...added].sort((a, b) =>
    (a.from ?? "").localeCompare(b.from ?? ""),
  );
  const covered: CoveredRange[] = [];
  for (const range of sorted) {
    const prev = covered[covered.length - 1];
    if (prev && range.from !== null && range.from <= addDays(prev.to, 1)) {
      if (range.to > prev.to) prev.to = range.to;
    } else {
      covered.push({ ...range });
    }
  }
  return {
    symbol: options.symbol,
    prices,
    covered,
    fetchedAt: options.touchesTail || !entry ? options.fetchedAt : entry.fetchedAt,
  };
}

/** A quote from the last two cached closes, so no quote endpoint is needed. */
export function deriveQuote(symbol: string, prices: readonly DailyPrice[]): Quote | undefined {
  const [latest, previous] = prices;
  if (!latest || !previous) return undefined;
  const change = latest.close - previous.close;
  return {
    symbol,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    price: latest.close,
    latestTradingDay: latest.date,
    previousClose: previous.close,
    change,
    changePercent: (change / previous.close) * 100,
  };
}
