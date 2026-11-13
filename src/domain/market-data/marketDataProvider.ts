/** Decides which API endpoints serve a symbol: equities, digital currencies or commodities. */
export type AssetKind = "stock" | "crypto" | "commodity";

export interface Quote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePercent: number;
  latestTradingDay: string;
}

export interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type MarketDataErrorCode =
  | "RATE_LIMITED"
  | "SYMBOL_NOT_FOUND"
  | "REQUEST_FAILED"
  | "INVALID_RESPONSE";

export class MarketDataError extends Error {
  readonly code: MarketDataErrorCode;

  constructor(code: MarketDataErrorCode, message: string) {
    super(message);
    this.name = "MarketDataError";
    this.code = code;
  }
}

export interface MarketDataProvider {
  getQuote(symbol: string, kind?: AssetKind): Promise<Quote>;
  /**
   * Daily prices, newest first. `compact` is ~100 days, `full` is the whole history.
   * Close-only series (e.g. oil) repeat the close in open/high/low.
   */
  getDailyPrices(
    symbol: string,
    options?: { kind?: AssetKind; limit?: number; outputSize?: "compact" | "full" },
  ): Promise<DailyPrice[]>;
  /** The request `getDailyPrices` sends, without credentials, for showing to the user. */
  describeDailyPricesRequest(
    symbol: string,
    options?: { kind?: AssetKind; outputSize?: "compact" | "full" },
  ): string;
}
