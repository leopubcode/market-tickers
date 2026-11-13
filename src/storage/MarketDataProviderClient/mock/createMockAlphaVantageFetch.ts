import { generateSeries, SERIES_LENGTH, tradingDates, type MockDay } from "./generateSeries.ts";
import { TICKER_PROFILES } from "./tickerProfiles.ts";

export interface MockAlphaVantageOptions {
  /** Simulated network latency per request. */
  latencyMs?: number;
  now?: () => Date;
}

const COMPACT_LENGTH = 100;
const price = (n: number) => n.toFixed(4);
const invalidCall = (fn: string) => ({
  "Error Message": `Invalid API call. Please retry or visit the documentation (https://www.alphavantage.co/documentation/) for ${fn}.`,
});

/**
 * A stand-in for `fetch` that answers like https://www.alphavantage.co/query
 * (GLOBAL_QUOTE, TIME_SERIES_DAILY, DIGITAL_CURRENCY_DAILY, GOLD_SILVER_HISTORY,
 * WTI and BRENT) from generated data. It never touches
 * the network, so it has no rate limit.
 */
export function createMockAlphaVantageFetch(options: MockAlphaVantageOptions = {}): typeof fetch {
  const { latencyMs = 150, now = () => new Date() } = options;
  const profiles = new Map(TICKER_PROFILES.map((p) => [p.symbol, p]));
  const dates = tradingDates(now(), SERIES_LENGTH);
  const cache = new Map<string, MockDay[]>();

  function seriesFor(symbol: string): MockDay[] | undefined {
    const profile = profiles.get(symbol);
    if (!profile) return undefined;
    let series = cache.get(symbol);
    if (!series) {
      series = generateSeries(profile, profile.tradingDays ? dates.slice(-profile.tradingDays) : dates);
      cache.set(symbol, series);
    }
    return series;
  }

  function respond(params: URLSearchParams): unknown {
    const fn = params.get("function");
    const symbol = (params.get("symbol") ?? "").toUpperCase();
    const series = seriesFor(symbol);
    const kind = profiles.get(symbol)?.kind ?? "stock";

    if (fn === "DIGITAL_CURRENCY_DAILY") {
      if (!series || kind !== "crypto") return invalidCall(fn);
      const entries = series
        .slice()
        .reverse()
        .map((d) => [
          d.date,
          {
            "1. open": price(d.open),
            "2. high": price(d.high),
            "3. low": price(d.low),
            "4. close": price(d.close),
            "5. volume": String(d.volume),
          },
        ]);
      return { "Time Series (Digital Currency Daily)": Object.fromEntries(entries) };
    }

    if (fn === "GOLD_SILVER_HISTORY" || fn === "WTI" || fn === "BRENT") {
      const oil = fn !== "GOLD_SILVER_HISTORY";
      const profile = oil ? profiles.get(fn === "BRENT" ? "WTI" : fn) : profiles.get(symbol);
      const commoditySeries = profile ? seriesFor(profile.symbol) : undefined;
      if (!commoditySeries || profile?.kind !== "commodity") return invalidCall(fn);
      // Gold and silver report `price`, oil reports `value`, as the real API does.
      const data = commoditySeries
        .slice()
        .reverse()
        .map((d) => ({ date: d.date, [oil ? "value" : "price"]: price(d.close) }));
      return { interval: "daily", data };
    }

    if (fn === "GLOBAL_QUOTE") {
      if (!series) return { "Global Quote": {} };
      const last = series[series.length - 1];
      const prev = series[series.length - 2];
      const change = last.close - prev.close;
      return {
        "Global Quote": {
          "01. symbol": symbol,
          "02. open": price(last.open),
          "03. high": price(last.high),
          "04. low": price(last.low),
          "05. price": price(last.close),
          "06. volume": String(last.volume),
          "07. latest trading day": last.date,
          "08. previous close": price(prev.close),
          "09. change": price(change),
          "10. change percent": `${((change / prev.close) * 100).toFixed(4)}%`,
        },
      };
    }

    if (fn === "TIME_SERIES_DAILY") {
      if (!series) {
        return {
          "Error Message":
            "Invalid API call. Please retry or visit the documentation (https://www.alphavantage.co/documentation/) for TIME_SERIES_DAILY.",
        };
      }
      const count = params.get("outputsize") === "full" ? series.length : COMPACT_LENGTH;
      const entries = series
        .slice(-count)
        .reverse()
        .map((d) => [
          d.date,
          {
            "1. open": price(d.open),
            "2. high": price(d.high),
            "3. low": price(d.low),
            "4. close": price(d.close),
            "5. volume": String(d.volume),
          },
        ]);
      return {
        "Meta Data": {
          "1. Information": "Daily Prices (open, high, low, close) and Volumes",
          "2. Symbol": symbol,
          "3. Last Refreshed": series[series.length - 1].date,
          "4. Output Size": count === series.length ? "Full size" : "Compact",
          "5. Time Zone": "US/Eastern",
        },
        "Time Series (Daily)": Object.fromEntries(entries),
      };
    }

    return { "Error Message": `Invalid API call: unsupported function ${String(fn)}.` };
  }

  return (async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
    return Response.json(respond(url.searchParams));
  }) as typeof fetch;
}

export const MOCK_SYMBOLS = TICKER_PROFILES.map((p) => p.symbol);
