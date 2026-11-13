import { createContext, use } from 'react'
import type { PriceCacheService } from '../services/PriceCacheService.ts'

export const PriceCacheContext = createContext<PriceCacheService | null>(null)

export function usePriceCache(): PriceCacheService {
  const priceCache = use(PriceCacheContext)
  if (!priceCache) throw new Error('usePriceCache must be used inside AppServicesProvider')
  return priceCache
}
