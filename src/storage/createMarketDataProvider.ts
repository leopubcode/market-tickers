import type { MarketDataConfig } from "../config.ts";
import type { MarketDataProvider } from "../domain/market-data/marketDataProvider.ts";
import { AlphaVantageMarketDataProviderClient } from "./MarketDataProviderClient/AlphaVantageMarketDataProviderClient.ts";
import { createMockAlphaVantageFetch } from "./MarketDataProviderClient/mock/createMockAlphaVantageFetch.ts";

export function createMarketDataProvider(config: MarketDataConfig): MarketDataProvider {
  if (config.source === "live") {
    return new AlphaVantageMarketDataProviderClient(
      { apiKey: config.alphaVantageApiKey! },
      (input, init) => fetch(input, init),
    );
  }
  // Same client and parser as live; only the transport is swapped.
  return new AlphaVantageMarketDataProviderClient({ apiKey: "mock" }, createMockAlphaVantageFetch());
}
