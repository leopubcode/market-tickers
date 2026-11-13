export interface Quote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  latestTradingDay: string;
}

export interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
  getQuote(symbol: string): Promise<Quote>;
  /** Daily prices, newest first. */
  getDailyPrices(symbol: string, options?: { limit?: number }): Promise<DailyPrice[]>;
}
