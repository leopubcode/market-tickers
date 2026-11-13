import {
  MarketDataError,
  type DailyPrice,
  type MarketDataProvider,
  type Quote,
} from "../../domain/market-data/marketDataProvider.ts";

export interface AlphaVantageConfig {
  apiKey: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://www.alphavantage.co/query";

type AlphaVantageResponse = Record<string, unknown>;

export class AlphaVantageMarketDataProviderClient implements MarketDataProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: AlphaVantageConfig, fetchFn: typeof fetch) {
    if (!config.apiKey) throw new Error("Alpha Vantage API key is required");
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchFn = fetchFn;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const body = await this.request({ function: "GLOBAL_QUOTE", symbol });
    const raw = body["Global Quote"] as Record<string, string> | undefined;
    // Unknown symbols come back as an empty object rather than an error.
    if (!raw || Object.keys(raw).length === 0) {
      throw new MarketDataError("SYMBOL_NOT_FOUND", `No quote found for ${symbol}`);
    }
    return {
      symbol: raw["01. symbol"],
      open: toNumber(raw["02. open"]),
      high: toNumber(raw["03. high"]),
      low: toNumber(raw["04. low"]),
      price: toNumber(raw["05. price"]),
      volume: toNumber(raw["06. volume"]),
      latestTradingDay: raw["07. latest trading day"],
      previousClose: toNumber(raw["08. previous close"]),
      change: toNumber(raw["09. change"]),
      changePercent: toNumber(raw["10. change percent"].replace("%", "")),
    };
  }

  async getDailyPrices(symbol: string, options: { limit?: number } = {}): Promise<DailyPrice[]> {
    const body = await this.request({ function: "TIME_SERIES_DAILY", symbol });
    const series = body["Time Series (Daily)"] as
      | Record<string, Record<string, string>>
      | undefined;
    if (!series) {
      throw new MarketDataError("INVALID_RESPONSE", "Missing daily time series");
    }
    const prices = Object.entries(series)
      .map(([date, v]) => ({
        date,
        open: toNumber(v["1. open"]),
        high: toNumber(v["2. high"]),
        low: toNumber(v["3. low"]),
        close: toNumber(v["4. close"]),
        volume: toNumber(v["5. volume"]),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    return options.limit === undefined ? prices : prices.slice(0, options.limit);
  }

  private async request(params: Record<string, string>): Promise<AlphaVantageResponse> {
    const url = new URL(this.baseUrl);
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

    const body = (await response.json()) as AlphaVantageResponse;
    // Alpha Vantage reports errors with HTTP 200 and a message field in the body.
    if (typeof body["Error Message"] === "string") {
      throw new MarketDataError("SYMBOL_NOT_FOUND", body["Error Message"]);
    }
    const notice = body["Note"] ?? body["Information"];
    if (typeof notice === "string") {
      throw new MarketDataError("RATE_LIMITED", notice);
    }
    return body;
  }
}

function toNumber(value: string | undefined): number {
  const n = Number(value);
  if (value === undefined || Number.isNaN(n)) {
    throw new MarketDataError("INVALID_RESPONSE", `Expected a number, got ${String(value)}`);
  }
  return n;
}
