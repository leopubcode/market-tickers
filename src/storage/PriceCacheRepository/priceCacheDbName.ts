/** One database per source, so generated mock prices are never read as live ones. */
export const priceCacheDbName = (source: string) => `ticker-stocks:price-cache:${source}`;
