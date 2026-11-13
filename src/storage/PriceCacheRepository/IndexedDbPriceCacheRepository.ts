import type { CacheEntry } from "../../domain/price-cache/priceCache.ts";
import type { PriceCacheRepository } from "../../domain/price-cache/priceCacheRepository.ts";

const STORE = "entries";

/** One record per symbol; localStorage is too small for decades of daily prices. */
export class IndexedDbPriceCacheRepository implements PriceCacheRepository {
  private connection?: Promise<IDBDatabase>;
  private readonly dbName: string;
  private readonly idb: IDBFactory;

  constructor(dbName: string, idb: IDBFactory) {
    this.dbName = dbName;
    this.idb = idb;
  }

  async get(symbol: string) {
    return this.request<CacheEntry | undefined>("readonly", (store) => store.get(symbol));
  }

  async getAll() {
    return this.request<CacheEntry[]>("readonly", (store) => store.getAll());
  }

  async put(entry: CacheEntry) {
    await this.request("readwrite", (store) => store.put(entry));
  }

  private open(): Promise<IDBDatabase> {
    this.connection ??= new Promise((resolve, reject) => {
      const req = this.idb.open(this.dbName, 2);
      req.onupgradeneeded = () => {
        // Version 1 stored a single covered block; its entries cannot be read as ranges.
        if (req.result.objectStoreNames.contains(STORE)) req.result.deleteObjectStore(STORE);
        req.result.createObjectStore(STORE, { keyPath: "symbol" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.connection;
  }

  private async request<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}
