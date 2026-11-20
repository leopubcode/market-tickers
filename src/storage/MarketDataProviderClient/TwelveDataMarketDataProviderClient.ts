import {
  MarketDataError,
  type AssetKind,
  type DailyPrice,
  type MarketDataProvider,
  type Quote,
} from "../../domain/market-data/marketDataProvider.ts";

export interface TwelveDataConfig {
  apiKey: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.twelvedata.com";

/** Rows in the short and the long call; 5000 is the most one request returns (~20 years of weekdays). */
const COMPACT_ROWS = 100;
const FULL_ROWS = 5000;

type TwelveDataResponse = Record<string, unknown>;

/** Commodity symbols mapped to Twelve Data's pair notation. */
const COMMODITY_SYMBOLS: Record<string, string> = {
  XAU: "XAU/USD",
  XAG: "XAG/USD",
  WTI: "WTI/USD",
  BRENT: "XBR/USD",
};

export class TwelveDataMarketDataProviderClient implements MarketDataProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: TwelveDataConfig, fetchFn: typeof fetch) {
    if (!config.apiKey) throw new Error("Twelve Data API key is required");
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchFn = fetchFn;
  }

  async getQuote(symbol: string, kind: AssetKind = "stock"): Promise<Quote> {
    const body = await this.request("quote", { symbol: this.providerSymbol(symbol, kind) });
    return {
      symbol,
      open: toNumber(body["open"]),
      high: toNumber(body["high"]),
      low: toNumber(body["low"]),
      price: toNumber(body["close"]),
      latestTradingDay: String(body["datetime"]).slice(0, 10),
      previousClose: toNumber(body["previous_close"]),
      change: toNumber(body["change"]),
      changePercent: toNumber(body["percent_change"]),
    };
  }

  async getDailyPrices(
    symbol: string,
    options: { kind?: AssetKind; limit?: number; outputSize?: "compact" | "full" } = {},
  ): Promise<DailyPrice[]> {
    const params = this.dailyParams(symbol, options.kind ?? "stock", options.outputSize ?? "compact");
    const body = await this.request("time_series", params);
    const values = body["values"] as Record<string, string>[] | undefined;
    if (!Array.isArray(values)) {
      throw new MarketDataError("INVALID_RESPONSE", "Missing daily time series");
    }
    const prices = values.map((v) => ({
      date: String(v["datetime"]).slice(0, 10),
      open: toNumber(v["open"]),
      high: toNumber(v["high"]),
      low: toNumber(v["low"]),
      close: toNumber(v["close"]),
    }));
    prices.sort((a, b) => b.date.localeCompare(a.date));
    return options.limit === undefined ? prices : prices.slice(0, options.limit);
  }

  describeDailyPricesRequest(
    symbol: string,
    options: { kind?: AssetKind; outputSize?: "compact" | "full" } = {},
  ): string {
    const params = this.dailyParams(symbol, options.kind ?? "stock", options.outputSize ?? "compact");
    return new URLSearchParams({ function: "time_series", ...params }).toString().replaceAll("&", " ");
  }

  private dailyParams(symbol: string, kind: AssetKind, outputSize: string): Record<string, string> {
    return {
      symbol: this.providerSymbol(symbol, kind),
      interval: "1day",
      outputsize: String(outputSize === "full" ? FULL_ROWS : COMPACT_ROWS),
      order: "DESC",
    };
  }

  private providerSymbol(symbol: string, kind: AssetKind): string {
    if (kind === "crypto") return `${symbol}/USD`;
    if (kind === "commodity") {
      const mapped = COMMODITY_SYMBOLS[symbol.toUpperCase()];
      if (!mapped) throw new MarketDataError("SYMBOL_NOT_FOUND", `Unsupported commodity ${symbol}`);
      return mapped;
    }
    return symbol;
  }

  private async request(
    path: string,
    params: Record<string, string>,
  ): Promise<TwelveDataResponse> {
    const url = new URL(`${this.baseUrl}/${path}`);
    for (const [key, value] of Object.entries({ ...params, apikey: this.apiKey })) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await this.fetchFn(url);
    } catch (cause) {
      throw new MarketDataError("REQUEST_FAILED", `Network error: ${String(cause)}`);
    }
    if (!response.ok) {
      throw new MarketDataError("REQUEST_FAILED", `HTTP ${response.status}`);
    }

    const body = (await response.json()) as TwelveDataResponse;
    // Twelve Data reports errors with HTTP 200 and a status/code/message in the body.
    if (body["status"] === "error") {
      const message = String(body["message"] ?? "Unknown error");
      throw new MarketDataError(errorCode(Number(body["code"]), message), message);
    }
    return body;
  }
}

function errorCode(code: number, message: string) {
  if (code === 429) return "RATE_LIMITED";
  // Symbols on a higher plan answer 403 (or 400 on older responses) with a plan notice.
  if (code === 403 || /plan|upgrade/i.test(message)) return "PREMIUM_REQUIRED";
  if (code === 404 || /symbol|not found/i.test(message)) return "SYMBOL_NOT_FOUND";
  return "REQUEST_FAILED";
}

function toNumber(value: unknown): number {
  const n = Number(value);
  if (value === undefined || value === null || value === "" || Number.isNaN(n)) {
    throw new MarketDataError("INVALID_RESPONSE", `Expected a number, got ${String(value)}`);
  }
  return n;
}
