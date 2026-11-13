import type { CacheEntry } from "./priceCache.ts";

export const EXPORT_FORMAT = "ticker-stocks-price-cache";
/**
 * Version of the file layout. When it changes, keep the old parser, make it
 * return the current in-memory shape, and register it in `PARSERS`, so files
 * written by older versions still import.
 */
export const EXPORT_VERSION = 1;

export interface PriceCacheExport {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  /** MARKET_DATA_SOURCE the prices came from; mock and live data are never mixed. */
  source: string;
  entries: CacheEntry[];
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export function buildExport(
  source: string,
  entries: readonly CacheEntry[],
  exportedAt: string,
): PriceCacheExport {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt, source, entries: [...entries] };
}

const PARSERS: Record<number, (file: Record<string, unknown>) => PriceCacheExport> = {
  1: parseV1,
};

/** Reads an export file of any supported version, returning the current shape. */
export function parseExport(text: string): PriceCacheExport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("The file is not valid JSON.");
  }
  if (!isRecord(data) || data.format !== EXPORT_FORMAT) {
    throw new ImportError("This is not a ticker-stocks price cache export.");
  }
  const version = data.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new ImportError("The export has no valid version.");
  }
  if (version > EXPORT_VERSION) {
    throw new ImportError(
      `The export is version ${version}, but this app reads up to version ${EXPORT_VERSION}. Update the app to import it.`,
    );
  }
  const parser = PARSERS[version];
  if (!parser) throw new ImportError(`Export version ${version} is not supported.`);
  return parser(data);
}

function parseV1(file: Record<string, unknown>): PriceCacheExport {
  if (typeof file.source !== "string" || !file.source) {
    throw new ImportError("The export does not say which data source it came from.");
  }
  if (typeof file.exportedAt !== "string") throw new ImportError("The export has no export time.");
  if (!Array.isArray(file.entries)) throw new ImportError("The export has no entries.");
  return {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: file.exportedAt,
    source: file.source,
    entries: file.entries.map((entry, i) => parseEntry(entry, i)),
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isDay = (v: unknown): v is string => typeof v === "string" && DAY.test(v);

function parseEntry(raw: unknown, index: number): CacheEntry {
  const fail = (what: string): never => {
    throw new ImportError(`Entry ${index + 1} is invalid: ${what}.`);
  };
  if (!isRecord(raw)) return fail("not an object");
  const { symbol, prices, covered, fetchedAt } = raw;
  if (typeof symbol !== "string" || !symbol) return fail("missing symbol");
  if (typeof fetchedAt !== "string" || Number.isNaN(Date.parse(fetchedAt))) {
    return fail(`${symbol} has no valid fetch time`);
  }
  if (!Array.isArray(prices)) return fail(`${symbol} has no prices`);
  if (!Array.isArray(covered)) return fail(`${symbol} has no covered ranges`);

  return {
    symbol,
    fetchedAt,
    prices: prices.map((p) => {
      if (
        !isRecord(p) ||
        !isDay(p.date) ||
        ![p.open, p.high, p.low, p.close].every((n) => typeof n === "number" && Number.isFinite(n))
      ) {
        return fail(`${symbol} has a malformed price row`);
      }
      return { date: p.date, open: p.open as number, high: p.high as number, low: p.low as number, close: p.close as number };
    }),
    covered: covered.map((r) => {
      if (!isRecord(r) || !isDay(r.to) || !(r.from === null || isDay(r.from))) {
        return fail(`${symbol} has a malformed covered range`);
      }
      return { from: r.from, to: r.to };
    }),
  };
}
