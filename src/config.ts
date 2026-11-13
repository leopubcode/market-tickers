export type MarketDataSource = "mock" | "live";

export interface MarketDataConfig {
  source: MarketDataSource;
  alphaVantageApiKey?: string;
  /** Whether stock history older than ~100 trading days can be fetched (a premium feature). */
  fullHistory: boolean;
}

/**
 * MARKET_DATA_SOURCE=mock|live (default mock, so a missing variable can never
 * spend API quota). `live` also requires ALPHA_VANTAGE_API_KEY.
 * ALPHA_VANTAGE_PREMIUM=true|false sets `fullHistory`; it defaults to true for mock, false for live.
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
  const premium = env.ALPHA_VANTAGE_PREMIUM;
  if (premium !== undefined && premium !== "" && premium !== "true" && premium !== "false") {
    throw new Error(`ALPHA_VANTAGE_PREMIUM must be "true" or "false", got "${premium}"`);
  }
  const fullHistory = premium ? premium === "true" : source === "mock";
  return { source, alphaVantageApiKey, fullHistory };
}
