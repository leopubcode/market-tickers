import {
  MarketDataError,
  type AssetKind,
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

/** Commodity symbols mapped to the request that returns their daily history. */
const COMMODITY_REQUESTS: Record<string, Record<string, string>> = {
  XAU: { function: "GOLD_SILVER_HISTORY", symbol: "XAU", interval: "daily" },
  XAG: { function: "GOLD_SILVER_HISTORY", symbol: "XAG", interval: "daily" },
  WTI: { function: "WTI", interval: "daily" },
  BRENT: { function: "BRENT", interval: "daily" },
};

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

  async getQuote(symbol: string, kind: AssetKind = "stock"): Promise<Quote> {
    if (kind !== "stock") return this.deriveQuote(symbol, kind);

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

  async getDailyPrices(
    symbol: string,
    options: { kind?: AssetKind; limit?: number; outputSize?: "compact" | "full" } = {},
  ): Promise<DailyPrice[]> {
    const kind = options.kind ?? "stock";
    const prices =
      kind === "crypto"
        ? await this.fetchCryptoDaily(symbol)
        : kind === "commodity"
          ? await this.fetchCommodityDaily(symbol)
          : await this.fetchStockDaily(symbol, options.outputSize ?? "compact");
    prices.sort((a, b) => b.date.localeCompare(a.date));
    return options.limit === undefined ? prices : prices.slice(0, options.limit);
  }

  /** Crypto and commodities have no quote endpoint worth the extra call; use the last two days. */
  private async deriveQuote(symbol: string, kind: AssetKind): Promise<Quote> {
    const [latest, previous] = await this.getDailyPrices(symbol, { kind, limit: 2 });
    if (!latest || !previous) {
      throw new MarketDataError("INVALID_RESPONSE", `Not enough history to quote ${symbol}`);
    }
    const change = latest.close - previous.close;
    return {
      symbol,
      open: latest.open,
      high: latest.high,
      low: latest.low,
      price: latest.close,
      volume: latest.volume,
      latestTradingDay: latest.date,
      previousClose: previous.close,
      change,
      changePercent: (change / previous.close) * 100,
    };
  }

  private async fetchStockDaily(symbol: string, outputSize: string): Promise<DailyPrice[]> {
    const body = await this.request({
      function: "TIME_SERIES_DAILY",
      symbol,
      outputsize: outputSize,
    });
    const series = body["Time Series (Daily)"] as
      | Record<string, Record<string, string>>
      | undefined;
    if (!series) {
      throw new MarketDataError("INVALID_RESPONSE", "Missing daily time series");
    }
    return Object.entries(series).map(([date, v]) => ({
      date,
      open: toNumber(v["1. open"]),
      high: toNumber(v["2. high"]),
      low: toNumber(v["3. low"]),
      close: toNumber(v["4. close"]),
      volume: toNumber(v["5. volume"]),
    }));
  }

  private async fetchCryptoDaily(symbol: string): Promise<DailyPrice[]> {
    const body = await this.request({ function: "DIGITAL_CURRENCY_DAILY", symbol, market: "USD" });
    const series = body["Time Series (Digital Currency Daily)"] as
      | Record<string, Record<string, string>>
      | undefined;
    if (!series) {
      throw new MarketDataError("INVALID_RESPONSE", "Missing digital currency time series");
    }
    // Older responses suffix the quote currency, e.g. "1a. open (USD)".
    const field = (v: Record<string, string>, n: number, name: string) =>
      v[`${n}. ${name}`] ?? v[`${n}a. ${name} (USD)`];
    return Object.entries(series).map(([date, v]) => ({
      date,
      open: toNumber(field(v, 1, "open")),
      high: toNumber(field(v, 2, "high")),
      low: toNumber(field(v, 3, "low")),
      close: toNumber(field(v, 4, "close")),
      volume: toNumber(v["5. volume"]),
    }));
  }

  private async fetchCommodityDaily(symbol: string): Promise<DailyPrice[]> {
    const params = COMMODITY_REQUESTS[symbol.toUpperCase()];
    if (!params) {
      throw new MarketDataError("SYMBOL_NOT_FOUND", `Unsupported commodity ${symbol}`);
    }
    const body = await this.request(params);
    const data = body["data"] as { date: string; price?: string; value?: string }[] | undefined;
    if (!Array.isArray(data)) {
      throw new MarketDataError("INVALID_RESPONSE", "Missing commodity data");
    }
    // Commodity series carry a single price per day, and "." marks days without one.
    return data
      .map((d) => ({ date: d.date, raw: d.price ?? d.value }))
      .filter((d) => d.raw !== ".")
      .map(({ date, raw }) => {
        const close = toNumber(raw);
        return { date, open: close, high: close, low: close, close, volume: 0 };
      });
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
