import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import type { MarketDataSource } from '../config.ts'
import { toMarketDataConfig } from '../domain/settings/settings.ts'
import { PriceCacheService } from '../services/PriceCacheService.ts'
import { createMarketDataProvider } from '../storage/createMarketDataProvider.ts'
import { createPriceCacheRepository } from '../storage/createPriceCacheRepository.ts'
import { PriceCacheContext } from './PriceCacheContext.ts'
import { useSession } from './SessionContext.tsx'

const systemClock = () => new Date()

/** Least time between provider calls, from each plan's free-tier rate limit. */
const REQUEST_SPACING_MS: Record<MarketDataSource, number> = {
  mock: 0,
  alphavantage: 2000, // about one request per second
  twelvedata: 7500, // 8 requests per minute
}

/**
 * Builds the market data services from the session's settings. They hold the API key,
 * so they live here, in the tree, and are rebuilt (with a fresh query cache) whenever
 * the settings change; nothing is kept at module level.
 */
export function AppServicesProvider({ children }: { children: ReactNode }) {
  const { settings } = useSession()

  const { priceCache, queryClient } = useMemo(() => {
    const config = toMarketDataConfig(settings)
    return {
      priceCache: new PriceCacheService(
        createPriceCacheRepository(config),
        createMarketDataProvider(config),
        {
          source: config.source,
          fullHistory: config.fullHistory,
          requestSpacingMs: REQUEST_SPACING_MS[config.source],
        },
        systemClock,
      ),
      // Conservative defaults so a live API key's quota isn't burned by refetches.
      queryClient: new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000, retry: false, refetchOnWindowFocus: false },
        },
      }),
    }
  }, [settings])

  return (
    <QueryClientProvider client={queryClient}>
      <PriceCacheContext value={priceCache}>{children}</PriceCacheContext>
    </QueryClientProvider>
  )
}
