import type { AssetKind } from "../market-data/marketDataProvider.ts";
import { addDays, latestWeekday, nextWeekday, weekdaysBack } from "./calendar.ts";
import { COMPACT_LENGTH, coveredAsOf, type CacheEntry, type OutputSize } from "./priceCache.ts";

export type PlanReason = "not-cached" | "out-of-date" | "older-history";

export interface DateRange {
  /** Null reaches back to the start of the history. */
  from: string | null;
  to: string;
}

/**
 * One missing range of a symbol's cache and the provider call that fills it.
 * Approval is per range, so the id names the exact days.
 */
export interface PlanItem {
  symbol: string;
  kind: AssetKind;
  /** The call needed for this range alone. */
  outputSize: OutputSize;
  reason: PlanReason;
  range: DateRange;
}

export const planItemId = (item: PlanItem) =>
  `${item.symbol}|${item.range.from ?? ""}|${item.range.to}`;

/**
 * One provider call, and everything it is approved for. The provider cannot
 * fetch a date range, so a symbol needs a single call however many ranges are
 * missing; approving it approves all of its ranges, and only those days are kept.
 */
export interface PlanCall {
  symbol: string;
  kind: AssetKind;
  /** Full if any range needs it. */
  outputSize: OutputSize;
  /** Missing ranges the call is approved for, oldest first. */
  ranges: DateRange[];
  /** Whether a range reaches the latest day, so the call also refreshes the tail. */
  touchesTail: boolean;
}

/** Names the symbol and its exact ranges, so a different range is never approved by an old approval. */
export const planCallId = (call: PlanCall) =>
  `${call.symbol}|${call.ranges.map((r) => `${r.from ?? ""}..${r.to}`).join(",")}`;

/** Groups the ranges into one call per symbol, ordered by the most recent day each fills. */
export function groupCalls(items: readonly PlanItem[]): PlanCall[] {
  const calls = new Map<string, PlanCall>();
  for (const item of items) {
    const call = calls.get(item.symbol) ?? {
      symbol: item.symbol,
      kind: item.kind,
      outputSize: item.outputSize,
      ranges: [],
      touchesTail: false,
    };
    calls.set(item.symbol, call);
    call.ranges.unshift(item.range);
    if (item.outputSize === "full") call.outputSize = "full";
    if (item.reason !== "older-history") call.touchesTail = true;
  }
  return [...calls.values()];
}

export interface PlanTarget {
  symbol: string;
  kind: AssetKind;
}

/**
 * Lists the ranges the cache lacks for `start` (null = all history), most recent
 * first. A symbol can have two: the days since its last fetch and older history.
 * The provider cannot fetch a date range, so a call that fills one range may
 * also fill another; the service runs one call per symbol.
 */
export function planFetches(input: {
  targets: readonly PlanTarget[];
  entries: ReadonlyMap<string, CacheEntry>;
  start: string | null;
  today: string;
  /** Whether stocks can be fetched further back than the short call reaches. */
  fullHistory: boolean;
}): PlanItem[] {
  const { targets, entries, start, today, fullHistory } = input;
  const items = targets.flatMap(({ symbol, kind }) =>
    planSymbol({
      symbol,
      kind,
      entry: entries.get(symbol),
      start: reachableStart(kind, start, today, fullHistory),
      today,
    }),
  );

  // Stable sort keeps the target order for ties. A shallower range wins a tie on recency.
  return items.sort(
    (a, b) =>
      b.range.to.localeCompare(a.range.to) ||
      (b.range.from ?? "").localeCompare(a.range.from ?? ""),
  );
}

function planSymbol(input: {
  symbol: string;
  kind: AssetKind;
  entry: CacheEntry | undefined;
  start: string | null;
  today: string;
}): PlanItem[] {
  const { symbol, kind, entry, start, today } = input;
  const latest = latestExpectedDay(kind, today);
  return findGaps({ entry, kind, start, today }).map((range) => ({
    symbol,
    kind,
    range,
    reason: !entry ? "not-cached" : range.to === latest ? "out-of-date" : "older-history",
    outputSize: outputSizeFor(kind, range.from, latest),
  }));
}

/**
 * The oldest day a symbol can be fetched for. Without full history, stocks only
 * have the short call, so earlier days are not planned for; null means all history.
 */
export function reachableStart(
  kind: AssetKind,
  start: string | null,
  today: string,
  fullHistory: boolean,
): string | null {
  if (kind !== "stock" || fullHistory) return start;
  const floor = shortCallStart(latestExpectedDay(kind, today));
  return start === null || start < floor ? floor : start;
}

/** 100 weekdays reach back at least as far as 100 trading days. */
const shortCallStart = (latest: string) => weekdaysBack(latest, COMPACT_LENGTH);

/** Crypto trades every day, everything else on weekdays. */
const latestExpectedDay = (kind: AssetKind, today: string) =>
  kind === "crypto" ? today : latestWeekday(today);

/**
 * The days from `start` (null = the whole history) up to the latest trading day
 * that the cache does not hold, oldest first. Days before `start` never count.
 */
export function findGaps(input: {
  entry: CacheEntry | undefined;
  kind: AssetKind;
  start: string | null;
  today: string;
}): DateRange[] {
  const { entry, kind, start, today } = input;
  const latest = latestExpectedDay(kind, today);
  const gaps: DateRange[] = [];

  // "" stands for the beginning of time, so every date compares after it.
  let pos = start ?? "";
  for (const range of entry ? coveredAsOf(entry, today) : []) {
    if (range.to < pos) continue;
    const from = range.from ?? "";
    if (from > pos && pos <= latest) {
      gaps.push({ from: pos || null, to: addDays(from, -1) < latest ? addDays(from, -1) : latest });
    }
    pos = addDays(range.to, 1);
  }
  if (pos <= latest) gaps.push({ from: pos || null, to: latest });

  // Weekends are not missing data.
  return gaps.flatMap((gap) => {
    if (kind === "crypto") return [gap];
    const from = gap.from === null ? null : nextWeekday(gap.from);
    const to = latestWeekday(gap.to);
    return from !== null && from > to ? [] : [{ from, to }];
  });
}

/**
 * Only stocks have a short call, and it only helps when the whole range is
 * inside it; otherwise the cache would be left with a hole.
 */
function outputSizeFor(kind: AssetKind, from: string | null, latest: string): OutputSize {
  if (kind !== "stock" || from === null) return "full";
  return from >= shortCallStart(latest) ? "compact" : "full";
}
