import type { MarketDataConfig } from "../config.ts";
import type { PriceCacheRepository } from "../domain/price-cache/priceCacheRepository.ts";
import { IndexedDbPriceCacheRepository } from "./PriceCacheRepository/IndexedDbPriceCacheRepository.ts";
import { InMemoryPriceCacheRepository } from "./PriceCacheRepository/InMemoryPriceCacheRepository.ts";

export function createPriceCacheRepository(config: MarketDataConfig): PriceCacheRepository {
  if (typeof indexedDB === "undefined") return new InMemoryPriceCacheRepository();
  // One database per source, so generated mock prices are never read as live ones.
  return new IndexedDbPriceCacheRepository(`ticker-stocks:price-cache:${config.source}`, indexedDB);
}
