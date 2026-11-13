import assert from "node:assert/strict";
import { beforeEach, it } from "vitest";
import { AlphaVantageMarketDataProviderClient } from "../src/storage/MarketDataProviderClient/AlphaVantageMarketDataProviderClient.ts";

// Opt-in: makes two real requests (one per test) (free tier: 25/day, 5/min).
// Run with: npm run test:live (reads ALPHA_VANTAGE_API_KEY from .env)
const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

// The free tier allows 1 request per second.
beforeEach(() => new Promise((resolve) => setTimeout(resolve, 1500)));

it.skipIf(!apiKey)("fetches a real quote", async () => {
  const client = new AlphaVantageMarketDataProviderClient({ apiKey: apiKey! }, fetch);
  const quote = await client.getQuote("IBM");
  assert.equal(quote.symbol, "IBM");
  assert.ok(quote.price > 0);
});

it.skipIf(!apiKey)("fetches real daily prices", async () => {
  const client = new AlphaVantageMarketDataProviderClient({ apiKey: apiKey! }, fetch);
  const prices = await client.getDailyPrices("IBM", { limit: 5 });
  assert.equal(prices.length, 5);
  assert.ok(prices[0].date > prices[1].date);
  assert.ok(prices[0].close > 0);
});
