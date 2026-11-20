import assert from "node:assert/strict";
import { beforeEach, it } from "vitest";
import { TwelveDataMarketDataProviderClient } from "../src/storage/MarketDataProviderClient/TwelveDataMarketDataProviderClient.ts";

// Opt-in: makes two real requests (free tier: 8/min, 800/day).
// Run with: npm run test:live (reads TWELVEDATA_API_KEY from .env)
const apiKey = process.env.TWELVEDATA_API_KEY;

beforeEach(() => new Promise((resolve) => setTimeout(resolve, 8000)));

it.skipIf(!apiKey)("fetches a real quote", async () => {
  const client = new TwelveDataMarketDataProviderClient({ apiKey: apiKey! }, fetch);
  const quote = await client.getQuote("IBM");
  assert.equal(quote.symbol, "IBM");
  assert.ok(quote.price > 0);
});

it.skipIf(!apiKey)("fetches real daily prices", async () => {
  const client = new TwelveDataMarketDataProviderClient({ apiKey: apiKey! }, fetch);
  const prices = await client.getDailyPrices("IBM", { limit: 5 });
  assert.equal(prices.length, 5);
  assert.ok(prices[0].date > prices[1].date);
  assert.ok(prices[0].close > 0);
});
