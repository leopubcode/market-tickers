import { MarketDataError, type MarketDataProvider } from "../domain/market-data/marketDataProvider.ts";
import { toDay } from "../domain/price-cache/calendar.ts";
import { groupCalls, planFetches, type PlanCall, type PlanItem, type PlanTarget } from "../domain/price-cache/fetchPlan.ts";
import { applyFetch, type CacheEntry } from "../domain/price-cache/priceCache.ts";
import type { PriceCacheRepository } from "../domain/price-cache/priceCacheRepository.ts";

export interface BuildOutcome {
  symbol: string;
  status: "running" | "done" | "failed" | "skipped";
  message?: string;
}

export class PriceCacheService {
  private readonly repository: PriceCacheRepository;
  private readonly provider: MarketDataProvider;
  private readonly now: () => Date;

  constructor(repository: PriceCacheRepository, provider: MarketDataProvider, now: () => Date) {
    this.repository = repository;
    this.provider = provider;
    this.now = now;
  }

  today(): string {
    return toDay(this.now());
  }

  async get(symbol: string): Promise<CacheEntry | undefined> {
    return this.repository.get(symbol);
  }

  /**
   * The provider calls that fill the cache, most recent gap first. Never calls
   * the provider; `start` is the oldest day needed, null for all history.
   */
  async plan(targets: readonly PlanTarget[], start: string | null): Promise<PlanCall[]> {
    return groupCalls(await this.planRanges(targets, start));
  }

  /** The request a call sends, for showing to the user. */
  describe(call: PlanCall): string {
    return this.provider.describeDailyPricesRequest(call.symbol, {
      kind: call.kind,
      outputSize: call.outputSize,
    });
  }

  async planRanges(targets: readonly PlanTarget[], start: string | null): Promise<PlanItem[]> {
    const found = await Promise.all(targets.map((t) => this.repository.get(t.symbol)));
    const entries = new Map(found.flatMap((e) => (e ? [[e.symbol, e] as const] : [])));
    return planFetches({ targets, entries, start, today: this.today() });
  }

  /**
   * Runs the approved calls in the order given, one at a time. A rate limit
   * ends the run, since every later call would be refused too.
   */
  async build(
    calls: readonly PlanCall[],
    onProgress: (outcome: BuildOutcome) => void = () => {},
  ): Promise<BuildOutcome[]> {
    const outcomes: BuildOutcome[] = [];
    const report = (outcome: BuildOutcome) => {
      if (outcome.status !== "running") outcomes.push(outcome);
      onProgress(outcome);
    };

    let rateLimited = false;
    for (const call of calls) {
      if (rateLimited) {
        report({ symbol: call.symbol, status: "skipped", message: "Rate limit reached" });
        continue;
      }
      report({ symbol: call.symbol, status: "running" });
      try {
        await this.fetchInto(call);
        report({ symbol: call.symbol, status: "done" });
      } catch (error) {
        rateLimited = error instanceof MarketDataError && error.code === "RATE_LIMITED";
        report({
          symbol: call.symbol,
          status: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return outcomes;
  }

  private async fetchInto(call: PlanCall): Promise<void> {
    const fetchedAt = this.now().toISOString();
    const fetched = await this.provider.getDailyPrices(call.symbol, {
      kind: call.kind,
      outputSize: call.outputSize,
    });
    const entry = await this.repository.get(call.symbol);
    await this.repository.put(
      applyFetch(entry, fetched, {
        symbol: call.symbol,
        fetchedAt,
        ranges: call.ranges,
        touchesTail: call.touchesTail,
      }),
    );
  }
}
