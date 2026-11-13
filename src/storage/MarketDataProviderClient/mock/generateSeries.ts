import type { TickerProfile } from "./tickerProfiles.ts";

export interface MockDay {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ~5 years of trading days, enough for outputsize=full.
export const SERIES_LENGTH = 1300;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Weekdays only, newest last, ending on the most recent weekday on or before `now`. */
export function tradingDates(now: Date, count: number): string[] {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dates: string[] = [];
  while (dates.length < count) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return dates.reverse();
}

/**
 * Deterministic daily series: log-price follows a Brownian bridge between the
 * profile's waypoints, so the shape is controlled but still noisy day to day.
 */
export function generateSeries(profile: TickerProfile, dates: string[]): MockDay[] {
  const rand = mulberry32(hashString(profile.symbol));
  const n = dates.length;
  const segments = profile.waypoints.length - 1;

  // Slowly varying volatility regime (calm and turbulent stretches).
  const phase = rand() * Math.PI * 2;
  const regime = (i: number) => 1 + 0.45 * Math.sin(phase + (i / n) * Math.PI * 7);

  const logCloses: number[] = [];
  for (let s = 0; s < segments; s++) {
    const from = Math.round((s * (n - 1)) / segments);
    const to = Math.round(((s + 1) * (n - 1)) / segments);
    const len = to - from;
    const a = Math.log(profile.waypoints[s]);
    const b = Math.log(profile.waypoints[s + 1]);

    const walk = [0];
    for (let k = 1; k <= len; k++) {
      walk.push(walk[k - 1] + gaussian(rand) * profile.volatility * regime(from + k));
    }
    for (let k = s === 0 ? 0 : 1; k <= len; k++) {
      // Subtracting the walk's drift pins both ends to the waypoints.
      const bridge = walk[k] - (k / len) * walk[len];
      logCloses.push(a + ((b - a) * k) / len + bridge);
    }
  }
  const closes = logCloses.map(Math.exp);

  return dates.map((date, i) => {
    const close = closes[i];
    const open = i === 0 ? close : closes[i - 1] * (1 + 0.25 * profile.volatility * gaussian(rand));
    const ret = i === 0 ? 0 : Math.abs(close / closes[i - 1] - 1);
    const high = Math.max(open, close) * (1 + Math.abs(gaussian(rand)) * 0.3 * profile.volatility);
    const low = Math.min(open, close) * (1 - Math.abs(gaussian(rand)) * 0.3 * profile.volatility);
    const volume = Math.round(
      profile.baseVolume * Math.exp(0.3 * gaussian(rand)) * (1 + (ret / profile.volatility) * 0.25),
    );
    return { date, open, high, low, close, volume };
  });
}
