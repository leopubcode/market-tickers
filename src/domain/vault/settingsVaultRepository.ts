/** Where the encrypted vault text is kept. */
export interface SettingsVaultRepository {
  read(): string | null;
  write(text: string): void;
  clear(): void;
}
