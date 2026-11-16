import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { toMarketDataConfig } from '../domain/settings/settings.ts'
import { PriceCacheService } from '../services/PriceCacheService.ts'
import { createMarketDataProvider } from '../storage/createMarketDataProvider.ts'
import { createPriceCacheRepository } from '../storage/createPriceCacheRepository.ts'
import { PriceCacheContext } from './PriceCacheContext.ts'
import { useSession } from './SessionContext.tsx'

const systemClock = () => new Date()

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
          // The mock has no throttle; Alpha Vantage allows about one request per second.
          requestSpacingMs: config.source === 'live' ? 2000 : 0,
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
