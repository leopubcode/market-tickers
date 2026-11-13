export type MarketDataSource = "mock" | "live";

export interface MarketDataConfig {
  source: MarketDataSource;
  alphaVantageApiKey?: string;
}

/**
 * MARKET_DATA_SOURCE=mock|live (default mock, so a missing variable can never
 * spend API quota). `live` also requires ALPHA_VANTAGE_API_KEY.
 */
export function loadMarketDataConfig(env: Record<string, string | undefined>): MarketDataConfig {
  const source = env.MARKET_DATA_SOURCE ?? "mock";
  if (source !== "mock" && source !== "live") {
    throw new Error(`MARKET_DATA_SOURCE must be "mock" or "live", got "${source}"`);
  }
  const alphaVantageApiKey = env.ALPHA_VANTAGE_API_KEY;
  if (source === "live" && !alphaVantageApiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY is required when MARKET_DATA_SOURCE=live");
  }
  return { source, alphaVantageApiKey };
}
