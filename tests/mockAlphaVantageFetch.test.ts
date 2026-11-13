import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MarketDataError } from "../src/domain/market-data/marketDataProvider.ts";
import { AlphaVantageMarketDataProviderClient } from "../src/storage/MarketDataProviderClient/AlphaVantageMarketDataProviderClient.ts";
import { createMockAlphaVantageFetch } from "../src/storage/MarketDataProviderClient/mock/createMockAlphaVantageFetch.ts";
import { createMarketDataProvider } from "../src/storage/createMarketDataProvider.ts";

const NOW = new Date("2026-11-13T12:00:00Z"); // a Friday
const client = new AlphaVantageMarketDataProviderClient(
  { apiKey: "mock" },
  createMockAlphaVantageFetch({ latencyMs: 0, now: () => NOW }),
);

describe("mock Alpha Vantage server", () => {
  it("returns a quote through the real client", async () => {
    const q = await client.getQuote("ibm");
    assert.equal(q.symbol, "IBM");
    assert.equal(q.latestTradingDay, "2026-11-13");
    assert.ok(Math.abs(q.price - 230) < 1e-9); // last waypoint
    assert.ok(Math.abs(q.change - (q.price - q.previousClose)) < 1e-3);
  });

  it("returns 100 weekday-only, newest-first days by default", async () => {
    const prices = await client.getDailyPrices("AAPL");
    assert.equal(prices.length, 100);
    assert.equal(prices[0].date, "2026-11-13");
    for (const p of prices) {
      const dow = new Date(p.date + "T00:00:00Z").getUTCDay();
      assert.ok(dow !== 0 && dow !== 6);
      assert.ok(p.high >= Math.max(p.open, p.close) && p.low <= Math.min(p.open, p.close));
    }
  });

  it("is deterministic and follows the made-up trend", async () => {
    const a = await client.getDailyPrices("TSLA", { limit: 10 });
    const b = await client.getDailyPrices("TSLA", { limit: 10 });
    assert.deepEqual(a, b);
    // TSLA waypoints go 220 -> 400 -> 110 ...; the full series should span a wide range.
    const rawFetch = createMockAlphaVantageFetch({ latencyMs: 0, now: () => NOW });
    const body = (await (await rawFetch(new URL("https://x/query?function=TIME_SERIES_DAILY&symbol=TSLA&outputsize=full"))).json()) as Record<string, Record<string, Record<string, string>>>;
    const closes = Object.values(body["Time Series (Daily)"]).map((d) => Number(d["4. close"]));
    assert.ok(closes.length > 1000);
    assert.ok(Math.max(...closes) > 300 && Math.min(...closes) < 150);
  });

  it("serves every watchlist ticker, with short history for recent IPOs", async () => {
    const { WATCHLIST } = await import("../src/features/dashboard/constants.ts");
    for (const { symbol } of WATCHLIST) {
      assert.equal((await client.getQuote(symbol)).symbol, symbol);
    }
    const raw = createMockAlphaVantageFetch({ latencyMs: 0, now: () => NOW });
    const body = (await (await raw(new URL("https://x/query?function=TIME_SERIES_DAILY&symbol=SPCX&outputsize=full"))).json()) as Record<string, Record<string, unknown>>;
    assert.equal(Object.keys(body["Time Series (Daily)"]).length, 110);
  });

  it("mimics API errors for unknown symbols", async () => {
    await assert.rejects(client.getQuote("NOPE"), (e: MarketDataError) => e.code === "SYMBOL_NOT_FOUND");
    await assert.rejects(client.getDailyPrices("NOPE"), (e: MarketDataError) => e.code === "SYMBOL_NOT_FOUND");
  });
});

describe("market data provider factory", () => {
  it("factory builds a working mock provider", async () => {
    const provider = createMarketDataProvider({ source: "mock", fullHistory: true });
    assert.equal((await provider.getQuote("KO")).symbol, "KO");
  });
});

describe("crypto and commodities", () => {
  it("serves bitcoin from the digital currency endpoint", async () => {
    const prices = await client.getDailyPrices("BTC", { kind: "crypto", limit: 5 });
    assert.equal(prices.length, 5);
    const q = await client.getQuote("BTC", "crypto");
    assert.equal(q.symbol, "BTC");
    assert.ok(Math.abs(q.price - 95_000) < 1e-6);
    assert.ok(Math.abs(q.change - (q.price - q.previousClose)) < 1e-3);
  });

  it("serves gold and oil as close-only series", async () => {
    for (const [symbol, last] of [["XAU", 4_000], ["WTI", 62]] as const) {
      const prices = await client.getDailyPrices(symbol, { kind: "commodity", limit: 3 });
      assert.equal(prices[0].date, "2026-11-13");
      assert.ok(Math.abs(prices[0].close - last) < 1e-6);
      assert.equal(prices[0].open, prices[0].close);
      assert.equal((await client.getQuote(symbol, "commodity")).symbol, symbol);
    }
  });

  it("skips oil days without a price", async () => {
    const fetchFn = (async () =>
      Response.json({
        data: [
          { date: "2026-11-13", value: "62.10" },
          { date: "2026-11-12", value: "." },
          { date: "2026-11-11", value: "61.00" },
        ],
      })) as unknown as typeof fetch;
    const oil = new AlphaVantageMarketDataProviderClient({ apiKey: "k" }, fetchFn);
    const prices = await oil.getDailyPrices("WTI", { kind: "commodity" });
    assert.deepEqual(prices.map((p) => p.date), ["2026-11-13", "2026-11-11"]);
  });

  it("rejects unknown commodities and mismatched kinds", async () => {
    await assert.rejects(
      client.getDailyPrices("COPPER", { kind: "commodity" }),
      (e: MarketDataError) => e.code === "SYMBOL_NOT_FOUND",
    );
    await assert.rejects(
      client.getDailyPrices("AAPL", { kind: "crypto" }),
      (e: MarketDataError) => e.code === "SYMBOL_NOT_FOUND",
    );
  });
});
