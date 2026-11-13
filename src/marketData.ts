import { loadMarketDataConfig } from './config.ts'
import { createMarketDataProvider } from './storage/createMarketDataProvider.ts'

export const marketDataConfig = loadMarketDataConfig(import.meta.env)

// Composition root: MARKET_DATA_SOURCE decides between the mock and live API.
export const marketData = createMarketDataProvider(marketDataConfig)
