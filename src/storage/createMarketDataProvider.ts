import type { MarketDataConfig } from "../config.ts";
import type { MarketDataProvider } from "../domain/market-data/marketDataProvider.ts";
import { AlphaVantageMarketDataProviderClient } from "./MarketDataProviderClient/AlphaVantageMarketDataProviderClient.ts";
import { createMockAlphaVantageFetch } from "./MarketDataProviderClient/mock/createMockAlphaVantageFetch.ts";
import { TwelveDataMarketDataProviderClient } from "./MarketDataProviderClient/TwelveDataMarketDataProviderClient.ts";

export function createMarketDataProvider(config: MarketDataConfig): MarketDataProvider {
  const liveFetch: typeof fetch = (input, init) => fetch(input, init);
  switch (config.source) {
    case "alphavantage":
      return new AlphaVantageMarketDataProviderClient({ apiKey: config.apiKey! }, liveFetch);
    case "twelvedata":
      return new TwelveDataMarketDataProviderClient({ apiKey: config.apiKey! }, liveFetch);
    case "mock":
      // Same client and parser as live; only the transport is swapped.
      return new AlphaVantageMarketDataProviderClient({ apiKey: "mock" }, createMockAlphaVantageFetch());
  }
}
