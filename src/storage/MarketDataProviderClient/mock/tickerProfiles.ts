import type { AssetKind } from "../../../domain/market-data/marketDataProvider.ts";

export interface TickerProfile {
  symbol: string;
  /** Defaults to "stock". */
  kind?: AssetKind;
  /** Typical daily move (standard deviation of daily returns), e.g. 0.015 = 1.5%. */
  volatility: number;
  /** Typical daily share volume. */
  baseVolume: number;
  /**
   * Made-up price path, evenly spaced from the oldest day to the latest.
   * The last waypoint is always the most recent close; the series wanders
   * between waypoints so charts show recognisable rallies and drawdowns.
   */
  waypoints: number[];
  /** Recently listed tickers only have this many trading days of history. */
  tradingDays?: number;
}

export const TICKER_PROFILES: TickerProfile[] = [
  { symbol: "AAPL", volatility: 0.016, baseVolume: 62_000_000, waypoints: [128, 172, 138, 165, 198, 232] },
  { symbol: "MSFT", volatility: 0.015, baseVolume: 24_000_000, waypoints: [235, 340, 245, 310, 415, 455] },
  { symbol: "GOOGL", volatility: 0.018, baseVolume: 28_000_000, waypoints: [140, 150, 88, 120, 142, 178] },
  { symbol: "AMZN", volatility: 0.021, baseVolume: 52_000_000, waypoints: [165, 170, 85, 120, 178, 205] },
  { symbol: "NVDA", volatility: 0.03, baseVolume: 310_000_000, waypoints: [14, 33, 16, 48, 125, 140] },
  { symbol: "TSLA", volatility: 0.035, baseVolume: 95_000_000, waypoints: [220, 400, 110, 260, 175, 330] },
  { symbol: "META", volatility: 0.024, baseVolume: 18_000_000, waypoints: [320, 340, 95, 200, 470, 590] },
  { symbol: "NFLX", volatility: 0.025, baseVolume: 4_500_000, waypoints: [520, 600, 180, 340, 600, 880] },
  { symbol: "AMD", volatility: 0.03, baseVolume: 55_000_000, waypoints: [95, 150, 60, 110, 165, 120] },
  { symbol: "IBM", volatility: 0.012, baseVolume: 4_200_000, waypoints: [125, 140, 120, 135, 165, 230] },
  { symbol: "JPM", volatility: 0.014, baseVolume: 9_500_000, waypoints: [155, 135, 125, 145, 190, 245] },
  { symbol: "KO", volatility: 0.009, baseVolume: 14_000_000, waypoints: [55, 63, 58, 60, 62, 70] },
  { symbol: "DIS", volatility: 0.02, baseVolume: 10_000_000, waypoints: [180, 145, 90, 95, 112, 100] },
  { symbol: "AVGO", volatility: 0.026, baseVolume: 25_000_000, waypoints: [62, 58, 45, 120, 190, 340] },
  { symbol: "TSM", volatility: 0.021, baseVolume: 14_000_000, waypoints: [115, 135, 80, 100, 175, 290] },
  { symbol: "MU", volatility: 0.028, baseVolume: 20_000_000, waypoints: [85, 90, 55, 70, 120, 200] },
  { symbol: "ORCL", volatility: 0.02, baseVolume: 9_000_000, waypoints: [105, 100, 75, 125, 190, 240] },
  { symbol: "CRWV", volatility: 0.05, baseVolume: 20_000_000, waypoints: [40, 165, 75, 140, 90] },
  // Listed 2026-06-12 (~110 trading days ago).
  { symbol: "SPCX", volatility: 0.035, baseVolume: 40_000_000, tradingDays: 110, waypoints: [150, 210, 165, 185] },
  { symbol: "MSTR", volatility: 0.045, baseVolume: 15_000_000, waypoints: [14, 30, 16, 40, 190, 330] },
  { symbol: "VOO", volatility: 0.009, baseVolume: 6_000_000, waypoints: [405, 432, 350, 385, 478, 545] },
  { symbol: "QQQ", volatility: 0.013, baseVolume: 40_000_000, waypoints: [300, 400, 265, 330, 440, 600] },
  { symbol: "BTC", kind: "crypto", volatility: 0.035, baseVolume: 30_000, waypoints: [16_500, 42_000, 16_000, 44_000, 70_000, 95_000] },
  { symbol: "XAU", kind: "commodity", volatility: 0.009, baseVolume: 0, waypoints: [1_800, 1_950, 1_750, 2_050, 2_650, 4_000] },
  { symbol: "XAG", kind: "commodity", volatility: 0.018, baseVolume: 0, waypoints: [22, 24, 19, 23, 31, 50] },
  { symbol: "WTI", kind: "commodity", volatility: 0.02, baseVolume: 0, waypoints: [70, 120, 75, 80, 70, 62] },
  { symbol: "SPY", volatility: 0.009, baseVolume: 70_000_000, waypoints: [440, 470, 380, 420, 520, 595] },
];
