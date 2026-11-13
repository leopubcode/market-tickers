import type { MarketDataConfig, MarketDataSource } from "../../config.ts";

export interface Settings {
  source: MarketDataSource;
  /** Alpha Vantage API key; only used by the live source. */
  apiKey: string;
  /** Whether the key is on a premium plan, which unlocks full stock history. */
  premium: boolean;
}

/** Mock by default, so a fresh install can never spend API quota. */
export const DEFAULT_SETTINGS: Settings = { source: "mock", apiKey: "", premium: false };

export class SettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsError";
  }
}

/** Checks the rules a user's settings must follow. */
export function validateSettings(settings: Settings): Settings {
  const apiKey = settings.apiKey.trim();
  if (settings.source === "live" && !apiKey) {
    throw new SettingsError("An API key is required for the live source.");
  }
  return { ...settings, apiKey };
}

/** Reads settings back from untrusted JSON, e.g. a decrypted vault. */
export function parseSettings(raw: unknown): Settings {
  const r = raw as Partial<Record<keyof Settings, unknown>> | null;
  if (
    typeof r !== "object" ||
    r === null ||
    (r.source !== "mock" && r.source !== "live") ||
    typeof r.apiKey !== "string" ||
    typeof r.premium !== "boolean"
  ) {
    throw new SettingsError("The stored settings are malformed.");
  }
  return { source: r.source, apiKey: r.apiKey, premium: r.premium };
}

export function toMarketDataConfig(settings: Settings): MarketDataConfig {
  return {
    source: settings.source,
    alphaVantageApiKey: settings.source === "live" ? settings.apiKey : undefined,
    fullHistory: settings.premium,
  };
}
