import { marketData, marketDataConfig } from './marketData.ts'
import { PriceCacheService } from './services/PriceCacheService.ts'
import { createPriceCacheRepository } from './storage/createPriceCacheRepository.ts'

// The cache sits in front of the provider whichever MARKET_DATA_SOURCE is set.
export const priceCache = new PriceCacheService(
  createPriceCacheRepository(marketDataConfig),
  marketData,
  () => new Date(),
)
