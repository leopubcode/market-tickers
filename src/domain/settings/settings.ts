import {
  isLiveSource,
  LIVE_SOURCES,
  SOURCE_LABELS,
  type LiveSource,
  type MarketDataConfig,
  type MarketDataSource,
} from "../../config.ts";

export interface Settings {
  source: MarketDataSource;
  /** One key per provider, so switching source never loses the other's key. */
  apiKeys: Record<LiveSource, string>;
  /** Whether the Alpha Vantage key is on a premium plan, which unlocks full stock history. */
  premium: boolean;
}

/** Mock by default, so a fresh install can never spend API quota. */
export const DEFAULT_SETTINGS: Settings = {
  source: "mock",
  apiKeys: { alphavantage: "", twelvedata: "" },
  premium: false,
};

export class SettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsError";
  }
}

/** Checks the rules a user's settings must follow. */
export function validateSettings(settings: Settings): Settings {
  const apiKeys = {
    alphavantage: settings.apiKeys.alphavantage.trim(),
    twelvedata: settings.apiKeys.twelvedata.trim(),
  };
  if (isLiveSource(settings.source) && !apiKeys[settings.source]) {
    throw new SettingsError(`An API key is required for ${SOURCE_LABELS[settings.source]}.`);
  }
  return { ...settings, apiKeys };
}

/** Reads settings back from untrusted JSON, e.g. a decrypted vault. */
export function parseSettings(raw: unknown): Settings {
  const r = raw as Record<string, unknown> | null;
  if (typeof r !== "object" || r === null || typeof r.premium !== "boolean") {
    throw new SettingsError("The stored settings are malformed.");
  }
  // Vaults written before Twelve Data existed held one Alpha Vantage key under "live".
  if (typeof r.apiKey === "string" && (r.source === "mock" || r.source === "live")) {
    return {
      source: r.source === "live" ? "alphavantage" : "mock",
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys, alphavantage: r.apiKey },
      premium: r.premium,
    };
  }
  const keys = r.apiKeys as Record<string, unknown> | null;
  if (
    (r.source !== "mock" && !LIVE_SOURCES.includes(r.source as LiveSource)) ||
    typeof keys !== "object" ||
    keys === null ||
    typeof keys.alphavantage !== "string" ||
    typeof keys.twelvedata !== "string"
  ) {
    throw new SettingsError("The stored settings are malformed.");
  }
  return {
    source: r.source as MarketDataSource,
    apiKeys: { alphavantage: keys.alphavantage, twelvedata: keys.twelvedata },
    premium: r.premium,
  };
}

export function toMarketDataConfig(settings: Settings): MarketDataConfig {
  const { source } = settings;
  return {
    source,
    apiKey: isLiveSource(source) ? settings.apiKeys[source] : undefined,
    // Twelve Data serves up to 5000 daily rows on every plan; Alpha Vantage gates full history.
    fullHistory: source === "twelvedata" || settings.premium,
  };
}
