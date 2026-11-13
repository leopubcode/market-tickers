export type MarketDataSource = "mock" | "live";

export interface MarketDataConfig {
  source: MarketDataSource;
  alphaVantageApiKey?: string;
  /** Whether stock history older than ~100 trading days can be fetched (a premium feature). */
  fullHistory: boolean;
}
