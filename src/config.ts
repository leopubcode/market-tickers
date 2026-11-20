/** `mock` generates prices locally; the others call a real provider's API. */
export type MarketDataSource = "mock" | "alphavantage" | "twelvedata";

export const LIVE_SOURCES = ["alphavantage", "twelvedata"] as const;
export type LiveSource = (typeof LIVE_SOURCES)[number];

export const SOURCE_LABELS: Record<MarketDataSource, string> = {
  mock: "Mock",
  alphavantage: "Alpha Vantage",
  twelvedata: "Twelve Data",
};

export const isLiveSource = (source: MarketDataSource): source is LiveSource =>
  source !== "mock";

export interface MarketDataConfig {
  source: MarketDataSource;
  /** Key for the selected live source; absent for mock. */
  apiKey?: string;
  /** Whether stock history older than ~100 trading days can be fetched. */
  fullHistory: boolean;
}
