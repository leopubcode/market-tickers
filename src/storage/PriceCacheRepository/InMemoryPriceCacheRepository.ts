import type { CacheEntry } from "../../domain/price-cache/priceCache.ts";
import type { PriceCacheRepository } from "../../domain/price-cache/priceCacheRepository.ts";

/** For tests and for browsers without IndexedDB; the cache then lasts one page load. */
export class InMemoryPriceCacheRepository implements PriceCacheRepository {
  private readonly entries = new Map<string, CacheEntry>();

  async get(symbol: string) {
    return this.entries.get(symbol);
  }

  async getAll() {
    return [...this.entries.values()];
  }

  async put(entry: CacheEntry) {
    this.entries.set(entry.symbol, entry);
  }
}
