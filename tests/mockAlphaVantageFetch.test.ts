import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { loadMarketDataConfig } from "../src/config.ts";
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
      assert.ok(p.volume > 0);
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

  it("mimics API errors for unknown symbols", async () => {
    await assert.rejects(client.getQuote("NOPE"), (e: MarketDataError) => e.code === "SYMBOL_NOT_FOUND");
    await assert.rejects(client.getDailyPrices("NOPE"), (e: MarketDataError) => e.code === "SYMBOL_NOT_FOUND");
  });
});

describe("market data config", () => {
  it("defaults to mock", () => {
    assert.equal(loadMarketDataConfig({}).source, "mock");
  });
  it("requires a key for live", () => {
    assert.throws(() => loadMarketDataConfig({ MARKET_DATA_SOURCE: "live" }));
    assert.equal(loadMarketDataConfig({ MARKET_DATA_SOURCE: "live", ALPHA_VANTAGE_API_KEY: "k" }).source, "live");
  });
  it("rejects unknown sources", () => {
    assert.throws(() => loadMarketDataConfig({ MARKET_DATA_SOURCE: "banana" }));
  });
  it("factory builds a working mock provider", async () => {
    const provider = createMarketDataProvider({ source: "mock" });
    assert.equal((await provider.getQuote("KO")).symbol, "KO");
  });
});
