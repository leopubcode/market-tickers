import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MarketDataError } from "../src/domain/market-data/marketDataProvider.ts";
import { TwelveDataMarketDataProviderClient } from "../src/storage/MarketDataProviderClient/TwelveDataMarketDataProviderClient.ts";

// Unit tests use a stubbed fetch, so they never count against the API quota.
function clientReturning(body: unknown, init?: ResponseInit) {
  const calls: URL[] = [];
  const fetchFn = (async (input: URL) => {
    calls.push(input);
    return Response.json(body, init);
  }) as unknown as typeof fetch;
  return { calls, client: new TwelveDataMarketDataProviderClient({ apiKey: "test-key" }, fetchFn) };
}

const bar = (datetime: string, close: string) => ({
  datetime,
  open: "1.0",
  high: "3.0",
  low: "0.5",
  close,
  volume: "10",
});

describe("TwelveDataMarketDataProviderClient", () => {
  it("parses a quote and sends the expected request", async () => {
    const { client, calls } = clientReturning({
      symbol: "IBM",
      datetime: "2026-11-12",
      open: "170.00",
      high: "172.50",
      low: "169.10",
      close: "171.25",
      previous_close: "169.75",
      change: "1.50",
      percent_change: "0.88",
    });

    const quote = await client.getQuote("IBM");

    assert.deepEqual(quote, {
      symbol: "IBM",
      open: 170,
      high: 172.5,
      low: 169.1,
      price: 171.25,
      latestTradingDay: "2026-11-12",
      previousClose: 169.75,
      change: 1.5,
      changePercent: 0.88,
    });
    assert.equal(calls[0].pathname, "/quote");
    assert.equal(calls[0].searchParams.get("symbol"), "IBM");
    assert.equal(calls[0].searchParams.get("apikey"), "test-key");
  });

  it("returns daily prices newest first and honors the limit", async () => {
    const { client, calls } = clientReturning({
      status: "ok",
      values: [bar("2026-11-10", "10"), bar("2026-11-12", "12"), bar("2026-11-11", "11")],
    });

    const prices = await client.getDailyPrices("IBM", { limit: 2 });

    assert.deepEqual(prices.map((p) => [p.date, p.close]), [["2026-11-12", 12], ["2026-11-11", 11]]);
    assert.equal(calls[0].pathname, "/time_series");
    assert.equal(calls[0].searchParams.get("interval"), "1day");
    assert.equal(calls[0].searchParams.get("outputsize"), "100");
  });

  it("asks for the longest series when the output size is full", async () => {
    const { client, calls } = clientReturning({ values: [] });
    await client.getDailyPrices("IBM", { outputSize: "full" });
    assert.equal(calls[0].searchParams.get("outputsize"), "5000");
  });

  it("maps crypto and commodities to Twelve Data pairs", async () => {
    const { client, calls } = clientReturning({ values: [bar("2026-11-12", "1")] });
    await client.getDailyPrices("BTC", { kind: "crypto" });
    await client.getDailyPrices("XAU", { kind: "commodity" });
    assert.equal(calls[0].searchParams.get("symbol"), "BTC/USD");
    assert.equal(calls[1].searchParams.get("symbol"), "XAU/USD");
    await assert.rejects(
      client.getDailyPrices("COPPER", { kind: "commodity" }),
      (e: MarketDataError) => e.code === "SYMBOL_NOT_FOUND",
    );
  });

  it("describes the request without the API key", () => {
    const { client } = clientReturning({});
    const text = client.describeDailyPricesRequest("IBM", { outputSize: "full" });
    assert.match(text, /symbol=IBM/);
    assert.match(text, /outputsize=5000/);
    assert.doesNotMatch(text, /test-key/);
  });

  it.each([
    [429, "You have run out of API credits for the current minute.", "RATE_LIMITED"],
    [404, "**symbol** not found: NOPE.", "SYMBOL_NOT_FOUND"],
    [403, "This symbol is available starting with Grow plan.", "PREMIUM_REQUIRED"],
    // Real response for WTI on the free plan: a plan notice under a 404.
    [404, "This symbol is available starting with the Grow or Venture plan. Consider upgrading now.", "PREMIUM_REQUIRED"],
    [401, "**apikey** parameter is incorrect.", "REQUEST_FAILED"],
  ])("maps error code %i to the right error", async (code, message, expected) => {
    const { client } = clientReturning({ code, message, status: "error" });
    await assert.rejects(client.getDailyPrices("IBM"), (e: MarketDataError) => e.code === expected);
  });

  it("rejects a response without a series", async () => {
    const { client } = clientReturning({ status: "ok" });
    await assert.rejects(client.getDailyPrices("IBM"), (e: MarketDataError) => e.code === "INVALID_RESPONSE");
  });

  it("reports HTTP failures", async () => {
    const { client } = clientReturning({}, { status: 500 });
    await assert.rejects(client.getQuote("IBM"), (e: MarketDataError) => e.code === "REQUEST_FAILED");
  });
});
