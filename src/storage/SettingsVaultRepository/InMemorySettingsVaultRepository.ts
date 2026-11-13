import type { SettingsVaultRepository } from "../../domain/vault/settingsVaultRepository.ts";

export class InMemorySettingsVaultRepository implements SettingsVaultRepository {
  private text: string | null = null;

  read() {
    return this.text;
  }

  write(text: string) {
    this.text = text;
  }

  clear() {
    this.text = null;
  }
}
