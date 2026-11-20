/**
 * One database per source, so prices from different providers (or generated mock
 * ones) are never mixed. Alpha Vantage keeps the name it had when it was the only
 * live source, so its existing cache survives.
 */
export const priceCacheDbName = (source: string) =>
  `ticker-stocks:price-cache:${source === "alphavantage" ? "live" : source}`;
