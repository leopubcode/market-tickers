import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MarketDataError } from "../src/domain/market-data/marketDataProvider.ts";
import { AlphaVantageMarketDataProviderClient } from "../src/storage/MarketDataProviderClient/AlphaVantageMarketDataProviderClient.ts";

// Unit tests use a stubbed fetch, so they never count against the API quota.
function clientReturning(body: unknown, init?: ResponseInit) {
  const calls: URL[] = [];
  const fetchFn = (async (input: URL) => {
    calls.push(input);
    return Response.json(body, init);
  }) as unknown as typeof fetch;
  return { calls, client: new AlphaVantageMarketDataProviderClient({ apiKey: "test-key" }, fetchFn) };
}

describe("AlphaVantageMarketDataProviderClient", () => {
  it("parses a quote and sends the expected request", async () => {
    const { client, calls } = clientReturning({
      "Global Quote": {
        "01. symbol": "IBM",
        "02. open": "170.00",
        "03. high": "172.50",
        "04. low": "169.10",
        "05. price": "171.25",
        "07. latest trading day": "2026-11-12",
        "08. previous close": "169.75",
        "09. change": "1.5000",
        "10. change percent": "0.8837%",
      },
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
      changePercent: 0.8837,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].searchParams.get("function"), "GLOBAL_QUOTE");
    assert.equal(calls[0].searchParams.get("symbol"), "IBM");
    assert.equal(calls[0].searchParams.get("apikey"), "test-key");
  });

  it("parses daily prices newest first and honours limit", async () => {
    const day = (c: string) => ({
      "1. open": "1", "2. high": "2", "3. low": "0.5", "4. close": c,
    });
    const { client } = clientReturning({
      "Time Series (Daily)": {
        "2026-11-10": day("1.1"),
        "2026-11-12": day("1.3"),
        "2026-11-11": day("1.2"),
      },
    });

    const prices = await client.getDailyPrices("IBM", { limit: 2 });

    assert.deepEqual(prices.map((p) => [p.date, p.close]), [
      ["2026-11-12", 1.3],
      ["2026-11-11", 1.2],
    ]);
  });

  it("maps the rate limit message to RATE_LIMITED", async () => {
    const { client } = clientReturning({ Information: "Thank you for using Alpha Vantage! rate limit" });
    await assert.rejects(client.getQuote("IBM"), (e: MarketDataError) => e.code === "RATE_LIMITED");
  });

  it("maps an empty quote to SYMBOL_NOT_FOUND", async () => {
    const { client } = clientReturning({ "Global Quote": {} });
    await assert.rejects(client.getQuote("NOPE"), (e: MarketDataError) => e.code === "SYMBOL_NOT_FOUND");
  });

  it("maps an error message to SYMBOL_NOT_FOUND", async () => {
    const { client } = clientReturning({ "Error Message": "Invalid API call." });
    await assert.rejects(client.getDailyPrices("NOPE"), (e: MarketDataError) => e.code === "SYMBOL_NOT_FOUND");
  });

  it("maps HTTP failures to REQUEST_FAILED", async () => {
    const { client } = clientReturning({}, { status: 500 });
    await assert.rejects(client.getQuote("IBM"), (e: MarketDataError) => e.code === "REQUEST_FAILED");
  });
});
