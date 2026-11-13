import type { CacheEntry } from "./priceCache.ts";

export interface PriceCacheRepository {
  get(symbol: string): Promise<CacheEntry | undefined>;
  put(entry: CacheEntry): Promise<void>;
}
