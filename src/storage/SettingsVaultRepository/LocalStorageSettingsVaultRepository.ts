import type { SettingsVaultRepository } from "../../domain/vault/settingsVaultRepository.ts";

const KEY = "ticker-stocks:vault";

export class LocalStorageSettingsVaultRepository implements SettingsVaultRepository {
  private readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  read() {
    return this.storage.getItem(KEY);
  }

  write(text: string) {
    this.storage.setItem(KEY, text);
  }

  clear() {
    this.storage.removeItem(KEY);
  }
}
