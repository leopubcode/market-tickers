import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { loadMarketDataConfig } from "../src/config.ts";
import { MarketDataError } from "../src/domain/market-data/marketDataProvider.ts";
import { planFetches, planItemId } from "../src/domain/price-cache/fetchPlan.ts";
import { applyFetch, COMPACT_LENGTH, type CacheEntry } from "../src/domain/price-cache/priceCache.ts";
import { addDays } from "../src/domain/price-cache/calendar.ts";
import { PriceCacheService } from "../src/services/PriceCacheService.ts";
import { AlphaVantageMarketDataProviderClient } from "../src/storage/MarketDataProviderClient/AlphaVantageMarketDataProviderClient.ts";
import { createMockAlphaVantageFetch } from "../src/storage/MarketDataProviderClient/mock/createMockAlphaVantageFetch.ts";
import { priceCacheDbName } from "../src/storage/PriceCacheRepository/priceCacheDbName.ts";
import { InMemoryPriceCacheRepository } from "../src/storage/PriceCacheRepository/InMemoryPriceCacheRepository.ts";

// 2026-11-13 is a Friday.
const TODAY = "2026-11-13";
const stock = (symbol: string) => ({ symbol, kind: "stock" as const });
// A fetch on `fetchedOn` made the days before it final, back to `from` (null = inception).
const entry = (
  symbol: string,
  over: { from?: string | null; fetchedOn?: string } = {},
): CacheEntry => {
  const fetchedOn = over.fetchedOn ?? TODAY;
  return {
    symbol,
    prices: [],
    covered: [{ from: over.from ?? null, to: addDays(fetchedOn, -1) }],
    fetchedAt: `${fetchedOn}T10:00:00.000Z`,
  };
};
const plan = (
  entries: CacheEntry[],
  start: string | null,
  targets = [stock("AAPL")],
  today = TODAY,
  fullHistory = true,
) =>
  planFetches({
    targets,
    entries: new Map(entries.map((e) => [e.symbol, e])),
    start,
    today,
    fullHistory,
  });

describe("planFetches", () => {
  it("asks for the short call when the range is recent and nothing is cached", () => {
    const [item] = plan([], "2026-09-01");
    assert.equal(item.reason, "not-cached");
    assert.equal(item.outputSize, "compact");
    assert.deepEqual(item.range, { from: "2026-09-01", to: TODAY });
  });

  it("asks for the full history for old ranges and for All", () => {
    assert.equal(plan([], "2020-01-01")[0].outputSize, "full");
    assert.equal(plan([], null)[0].outputSize, "full");
  });

  it("plans nothing when the cache was fetched today and reaches the start", () => {
    assert.deepEqual(plan([entry("AAPL", { from: "2026-01-01" })], "2026-09-01"), []);
  });

  it("refetches the days since the last fetch, as a short call", () => {
    const e = entry("AAPL", { fetchedOn: "2026-11-10" });
    const [item] = plan([e], "2026-09-01");
    assert.equal(item.reason, "out-of-date");
    assert.equal(item.outputSize, "compact");
    // Nov 10 was provisional when fetched, so it is the first missing day.
    assert.deepEqual(item.range, { from: "2026-11-10", to: TODAY });
  });

  it("only lists days from the picked start, even when the cache is much older", () => {
    const e = entry("AAPL", { fetchedOn: "2026-03-02" });
    const [item, ...rest] = plan([e], "2026-11-01");
    assert.equal(rest.length, 0);
    assert.deepEqual(item.range, { from: "2026-11-02", to: TODAY });
    assert.equal(item.outputSize, "compact");
    // Asking for the days in between needs the full call.
    assert.equal(plan([e], "2026-04-01")[0].outputSize, "full");
  });

  it("does not list a weekend start as missing", () => {
    const e = entry("AAPL", { from: "2026-11-09" });
    assert.deepEqual(plan([e], "2026-11-07"), []);
  });

  it("treats a weekend like the Friday before it", () => {
    const fridayFetch = entry("AAPL", { fetchedOn: "2026-11-13" });
    // Saturday: Friday's close was not final when fetched.
    assert.equal(plan([fridayFetch], "2026-10-01", [stock("AAPL")], "2026-11-14").length, 1);
    const saturdayFetch = entry("AAPL", { fetchedOn: "2026-11-14" });
    assert.equal(plan([saturdayFetch], "2026-10-01", [stock("AAPL")], "2026-11-15").length, 0);
  });

  it("plans older history when the cache starts after the requested start", () => {
    const e = entry("AAPL", { from: "2026-08-01" });
    const [item] = plan([e], "2026-06-01");
    assert.equal(item.reason, "older-history");
    assert.deepEqual(item.range, { from: "2026-06-01", to: "2026-07-31" });
  });

  it("lists the recent and the older gap as separate ranges, without the cached days between", () => {
    const e = entry("AAPL", { from: "2026-08-01", fetchedOn: "2026-11-11" });
    const items = plan([e], "2026-06-01");
    assert.deepEqual(
      items.map((i) => [i.reason, i.range.from, i.range.to, i.outputSize]),
      [
        ["out-of-date", "2026-11-11", TODAY, "compact"],
        ["older-history", "2026-06-01", "2026-07-31", "full"],
      ],
    );
    assert.notEqual(planItemId(items[0]), planItemId(items[1]));
  });

  it("orders the call with the most recent gap first", () => {
    const items = plan(
      [
        entry("OLD", { from: "2026-08-01" }),
        entry("STALE", { fetchedOn: "2026-11-12", from: "2026-01-01" }),
      ],
      "2026-06-01",
      [stock("OLD"), stock("NONE"), stock("STALE")],
    );
    assert.deepEqual(
      items.map((i) => i.symbol),
      // NONE and STALE both miss today; STALE misses fewer days. OLD only misses July.
      ["STALE", "NONE", "OLD"],
    );
  });

  describe("without full history (free plan)", () => {
    it("never plans stocks further back than the short call reaches", () => {
      for (const start of ["2020-01-01", null]) {
        const [item, ...rest] = plan([], start, [stock("AAPL")], TODAY, false);
        assert.equal(rest.length, 0);
        assert.equal(item.outputSize, "compact");
        // 100 weekdays before Friday 2026-11-13.
        assert.deepEqual(item.range, { from: "2026-06-26", to: TODAY });
      }
    });

    it("leaves recent ranges and other kinds alone", () => {
      assert.deepEqual(plan([], "2026-10-05", [stock("AAPL")], TODAY, false)[0].range.from, "2026-10-05");
      const btc = planFetches({
        targets: [{ symbol: "BTC", kind: "crypto" }],
        entries: new Map(),
        start: null,
        today: TODAY,
        fullHistory: false,
      });
      assert.deepEqual(btc[0].range, { from: null, to: TODAY });
    });

    it("plans nothing once the reachable days are cached", () => {
      const e = entry("AAPL", { from: "2026-06-26" });
      assert.deepEqual(plan([e], null, [stock("AAPL")], TODAY, false), []);
    });
  });

  it("treats crypto as trading every day", () => {
    const e = entry("BTC", { fetchedOn: "2026-11-13" });
    const items = planFetches({
      targets: [{ symbol: "BTC", kind: "crypto" }],
      entries: new Map([["BTC", e]]),
      start: "2026-10-01",
      today: "2026-11-14",
      fullHistory: true,
    });
    assert.equal(items[0].outputSize, "full");
    assert.equal(items[0].range.to, "2026-11-14");
  });
});

describe("applyFetch", () => {
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const date = addDays(TODAY, -i);
      return { date, open: 1, high: 1, low: 1, close: i };
    });
  const options = { symbol: "AAPL", fetchedAt: `${TODAY}T10:00:00.000Z`, touchesTail: true };

  it("keeps only the approved days of what the provider returned", () => {
    const e = applyFetch(undefined, rows(COMPACT_LENGTH), {
      ...options,
      ranges: [{ from: "2026-11-12", to: TODAY }],
    });
    assert.deepEqual(e.prices.map((p) => p.date), [TODAY, "2026-11-12"]);
    // Today is provisional, so only the day before is final.
    assert.deepEqual(e.covered, [{ from: "2026-11-12", to: "2026-11-12" }]);
  });

  it("covers the whole history for an open-ended range", () => {
    const e = applyFetch(undefined, rows(5), { ...options, ranges: [{ from: null, to: TODAY }] });
    assert.equal(e.prices.length, 5);
    assert.equal(e.covered[0].from, null);
  });

  it("keeps a hole between two fetches instead of claiming it", () => {
    const old = applyFetch(undefined, rows(COMPACT_LENGTH), {
      ...options,
      fetchedAt: "2026-03-01T10:00:00.000Z",
      ranges: [{ from: "2026-02-01", to: "2026-03-01" }],
    });
    const next = applyFetch(old, rows(COMPACT_LENGTH), {
      ...options,
      ranges: [{ from: "2026-11-10", to: TODAY }],
    });
    assert.equal(next.covered.length, 2);
  });

  it("leaves the fetch time alone when only older history was built", () => {
    const first = applyFetch(undefined, rows(10), { ...options, ranges: [{ from: null, to: TODAY }] });
    const later = applyFetch(first, rows(10), {
      ...options,
      fetchedAt: "2026-11-20T10:00:00.000Z",
      touchesTail: false,
      ranges: [{ from: "2026-11-01", to: "2026-11-03" }],
    });
    assert.equal(later.fetchedAt, first.fetchedAt);
  });
});

describe("PriceCacheService", () => {
  const now = () => new Date(`${TODAY}T12:00:00Z`);
  const setup = () => {
    const fetchFn = createMockAlphaVantageFetch({ latencyMs: 0, now });
    let calls = 0;
    const counting = ((...args: Parameters<typeof fetch>) => {
      calls++;
      return fetchFn(...args);
    }) as typeof fetch;
    const provider = new AlphaVantageMarketDataProviderClient({ apiKey: "mock" }, counting);
    const service = new PriceCacheService(new InMemoryPriceCacheRepository(), provider, { source: "mock", fullHistory: true }, now);
    return { service, calls: () => calls };
  };

  it("builds the plan, then needs no further calls", async () => {
    const { service, calls } = setup();
    const targets = [stock("AAPL"), { symbol: "BTC", kind: "crypto" as const }];

    const items = await service.plan(targets, "2026-09-01");
    assert.equal(items.length, 2);
    assert.equal(calls(), 0, "planning never calls the provider");

    const outcomes = await service.build(items);
    assert.deepEqual(outcomes.map((o) => o.status), ["done", "done"]);
    assert.equal(calls(), 2);

    assert.deepEqual(await service.plan(targets, "2026-09-01"), []);
    const dates = (await service.get("AAPL"))!.prices.map((p) => p.date);
    assert.equal(dates.at(-1), "2026-09-01");
    assert.equal(dates[0], TODAY);
  });

  it("builds only yesterday when that is the picked date", async () => {
    const { service } = setup();
    const items = await service.plan([stock("AAPL")], "2026-11-12");
    assert.deepEqual(items.map((i) => i.ranges), [[{ from: "2026-11-12", to: TODAY }]]);
    await service.build(items);
    assert.deepEqual((await service.get("AAPL"))!.prices.map((p) => p.date), [TODAY, "2026-11-12"]);
    assert.deepEqual(await service.plan([stock("AAPL")], "2026-11-12"), []);
  });

  it("runs one call per symbol for several approved ranges, full if any range needs it", async () => {
    const { service, calls } = setup();
    await service.build(await service.plan([stock("AAPL")], "2026-09-01"));
    // Two days later: a recent range (short call) and an older one (needs the full call).
    const later = new PriceCacheService(
      (service as unknown as { repository: InMemoryPriceCacheRepository }).repository,
      (service as unknown as { provider: AlphaVantageMarketDataProviderClient }).provider,
      { source: "mock", fullHistory: true },
      () => new Date("2026-11-17T12:00:00Z"),
    );
    const items = await later.plan([stock("AAPL")], "2020-01-01");
    // Two missing ranges, but a single call, and it is the full one.
    assert.equal(items.length, 1);
    assert.equal(items[0].ranges.length, 2);
    assert.equal(items[0].outputSize, "full");
    const before = calls();
    await later.build(items);
    assert.equal(calls() - before, 1);
    assert.deepEqual(await later.plan([stock("AAPL")], "2020-01-01"), []);
  });

  it("shows the request a call sends", async () => {
    const { service } = setup();
    const [call] = await service.plan([stock("AAPL")], "2026-11-12");
    assert.equal(service.describe(call), "function=TIME_SERIES_DAILY symbol=AAPL outputsize=compact");
  });

  it("waits between provider calls", async () => {
    const waits: number[] = [];
    const fetchFn = createMockAlphaVantageFetch({ latencyMs: 0, now });
    const provider = new AlphaVantageMarketDataProviderClient({ apiKey: "mock" }, fetchFn);
    const service = new PriceCacheService(
      new InMemoryPriceCacheRepository(),
      provider,
      { source: "mock", fullHistory: true, requestSpacingMs: 1000 },
      now,
      async (ms) => {
        waits.push(ms);
      },
    );
    const items = await service.plan([stock("AAPL"), stock("MSFT"), stock("NVDA")], "2026-11-09");
    await service.build(items);
    // No wait before the first call, one before each of the others.
    assert.equal(waits.length, 2);
    assert.ok(waits.every((ms) => ms > 900 && ms <= 1000));
  });

  it("reports a failed call and keeps going", async () => {
    const { service } = setup();
    const items = await service.plan([stock("NOPE"), stock("AAPL")], "2026-09-01");
    const outcomes = await service.build(items);
    assert.deepEqual(
      outcomes.map((o) => [o.symbol, o.status]).sort(),
      [["AAPL", "done"], ["NOPE", "failed"]],
    );
  });
});

describe("export and import", () => {
  const now = () => new Date(`${TODAY}T12:00:00Z`);
  const build = async (source = "mock") => {
    const provider = new AlphaVantageMarketDataProviderClient(
      { apiKey: "mock" },
      createMockAlphaVantageFetch({ latencyMs: 0, now }),
    );
    const service = new PriceCacheService(new InMemoryPriceCacheRepository(), provider, { source, fullHistory: true }, now);
    await service.build(await service.plan([stock("AAPL"), stock("MSFT")], "2026-11-09"));
    return service;
  };
  const empty = () =>
    new PriceCacheService(
      new InMemoryPriceCacheRepository(),
      new AlphaVantageMarketDataProviderClient({ apiKey: "mock" }, createMockAlphaVantageFetch()),
      { source: "mock", fullHistory: true },
      now,
    );

  it("writes a versioned file that imports into an empty cache", async () => {
    const { filename, text } = await (await build()).export();
    const file = JSON.parse(text);
    assert.equal(file.format, "ticker-stocks-price-cache");
    assert.equal(file.version, 1);
    assert.equal(file.source, "mock");
    assert.equal(filename, `ticker-stocks-cache-mock-${TODAY}.json`);

    const target = empty();
    const result = await target.import(text);
    assert.equal(result.symbols, 2);
    assert.deepEqual(await target.get("AAPL"), (await (await build()).get("AAPL")));
    // Importing the same file again adds nothing.
    assert.equal((await target.import(text)).addedPrices, 0);
  });

  it("merges into what is already cached", async () => {
    const { text } = await (await build()).export();
    const target = empty();
    await target.build(await target.plan([stock("AAPL")], "2026-11-02"));
    const before = (await target.get("AAPL"))!.prices.length;
    await target.import(text);
    assert.equal((await target.get("AAPL"))!.prices.length, before);
    assert.equal((await target.plan([stock("AAPL"), stock("MSFT")], "2026-11-09")).length, 0);
  });

  it("refuses a file from the other data source", async () => {
    const { text } = await (await build("live")).export();
    await assert.rejects(empty().import(text), /holds live prices/);
  });

  it("rejects files it cannot trust", async () => {
    const target = empty();
    const good = JSON.parse((await (await build()).export()).text);
    const cases: [unknown, RegExp][] = [
      ["not json", /not valid JSON/],
      [{ format: "other" }, /not a ticker-stocks/],
      [{ ...good, version: 2 }, /version 2.*up to version 1/],
      [{ ...good, version: "1" }, /no valid version/],
      [{ ...good, entries: [{ ...good.entries[0], prices: [{ date: "x" }] }] }, /malformed price row/],
    ];
    for (const [input, message] of cases) {
      await assert.rejects(
        target.import(typeof input === "string" ? input : JSON.stringify(input)),
        message,
      );
    }
    assert.equal(await target.get("AAPL"), undefined);
  });
});

describe("priceCacheDbName", () => {
  it("keeps mock and live prices in different databases", () => {
    assert.notEqual(priceCacheDbName("mock"), priceCacheDbName("live"));
  });
});

describe("Alpha Vantage notices", () => {
  const client = (message: string) =>
    new AlphaVantageMarketDataProviderClient(
      { apiKey: "k" },
      (async () => Response.json({ Information: message })) as unknown as typeof fetch,
    );

  it("tells a premium-only parameter apart from a rate limit", async () => {
    await assert.rejects(
      client("The outputsize=full parameter value is a premium feature for the TIME_SERIES_DAILY endpoint.").getDailyPrices("IBM", { outputSize: "full" }),
      (e: MarketDataError) => e.code === "PREMIUM_REQUIRED",
    );
    await assert.rejects(
      client("Our standard API rate limit is 25 requests per day.").getDailyPrices("IBM"),
      (e: MarketDataError) => e.code === "RATE_LIMITED",
    );
  });
});

describe("loadMarketDataConfig fullHistory", () => {
  const live = { MARKET_DATA_SOURCE: "live", ALPHA_VANTAGE_API_KEY: "k" };
  it("defaults to true for mock and false for live, and can be overridden", () => {
    assert.equal(loadMarketDataConfig({}).fullHistory, true);
    assert.equal(loadMarketDataConfig(live).fullHistory, false);
    assert.equal(loadMarketDataConfig({ ...live, ALPHA_VANTAGE_PREMIUM: "true" }).fullHistory, true);
    assert.equal(loadMarketDataConfig({ ALPHA_VANTAGE_PREMIUM: "false" }).fullHistory, false);
    assert.throws(() => loadMarketDataConfig({ ALPHA_VANTAGE_PREMIUM: "yes" }));
  });
});
