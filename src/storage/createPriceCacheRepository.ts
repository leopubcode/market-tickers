import type { MarketDataConfig } from "../config.ts";
import type { PriceCacheRepository } from "../domain/price-cache/priceCacheRepository.ts";
import { IndexedDbPriceCacheRepository } from "./PriceCacheRepository/IndexedDbPriceCacheRepository.ts";
import { priceCacheDbName } from "./PriceCacheRepository/priceCacheDbName.ts";
import { InMemoryPriceCacheRepository } from "./PriceCacheRepository/InMemoryPriceCacheRepository.ts";

export function createPriceCacheRepository(config: MarketDataConfig): PriceCacheRepository {
  if (typeof indexedDB === "undefined") return new InMemoryPriceCacheRepository();
  return new IndexedDbPriceCacheRepository(priceCacheDbName(config.source), indexedDB);
}
