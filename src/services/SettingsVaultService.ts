import {
  parseSettings,
  validateSettings,
  type Settings,
} from "../domain/settings/settings.ts";
import type { SettingsVaultRepository } from "../domain/vault/settingsVaultRepository.ts";
import {
  MIN_PASSWORD_LENGTH,
  parseVaultRecord,
  VaultError,
  type VaultRecord,
} from "../domain/vault/vaultRecord.ts";

/** PBKDF2 rounds for new vaults. Existing vaults keep the count they were made with. */
export const VAULT_ITERATIONS = 2_000_000;

/** Binds the ciphertext to this layout, so a record cannot be passed off as another. */
const ASSOCIATED_DATA = new TextEncoder().encode("ticker-stocks:vault:v1");

/**
 * An open vault. It lives only in the caller's memory: the key cannot be
 * exported, and the password is not kept, so saving reuses the derived key
 * (with a fresh IV) instead of asking again.
 */
export interface UnlockedVault {
  settings: Settings;
  key: CryptoKey;
  /** Base64 salt the key was derived with. */
  salt: string;
  iterations: number;
}

export class SettingsVaultService {
  private readonly repository: SettingsVaultRepository;
  private readonly iterations: number;
  private readonly crypto: Crypto;

  constructor(
    repository: SettingsVaultRepository,
    options: { iterations: number },
    crypto: Crypto,
  ) {
    this.repository = repository;
    this.iterations = options.iterations;
    this.crypto = crypto;
  }

  exists(): boolean {
    return this.repository.read() !== null;
  }

  async create(password: string, settings: Settings): Promise<UnlockedVault> {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new VaultError(
        "PASSWORD_TOO_SHORT",
        `The password needs at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }
    const valid = validateSettings(settings);
    const salt = this.crypto.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKey(password, salt, this.iterations);
    return this.persist({ settings: valid, key, salt: toBase64(salt), iterations: this.iterations });
  }

  async unlock(password: string): Promise<UnlockedVault> {
    const text = this.repository.read();
    if (text === null) throw new VaultError("CORRUPT", "There is no vault to unlock.");
    const record = parseVaultRecord(text);
    const key = await this.deriveKey(password, fromBase64(record.salt), record.iterations);

    let plain: ArrayBuffer;
    try {
      plain = await this.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(record.iv), additionalData: ASSOCIATED_DATA },
        key,
        fromBase64(record.data),
      );
    } catch {
      // GCM authenticates, so a wrong password and a tampered record look the same.
      throw new VaultError("WRONG_PASSWORD", "Wrong password.");
    }
    let settings: Settings;
    try {
      settings = parseSettings(JSON.parse(new TextDecoder().decode(plain)));
    } catch {
      throw new VaultError("CORRUPT", "The stored settings are malformed.");
    }
    return { settings, key, salt: record.salt, iterations: record.iterations };
  }

  /** Re-encrypts the vault with new settings, under the same password. */
  async save(vault: UnlockedVault, settings: Settings): Promise<UnlockedVault> {
    return this.persist({ ...vault, settings: validateSettings(settings) });
  }

  erase(): void {
    this.repository.clear();
  }

  private async persist(vault: UnlockedVault): Promise<UnlockedVault> {
    const iv = this.crypto.getRandomValues(new Uint8Array(12));
    const data = await this.crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: ASSOCIATED_DATA },
      vault.key,
      new TextEncoder().encode(JSON.stringify(vault.settings)),
    );
    const record: VaultRecord = {
      version: 1,
      kdf: "PBKDF2-SHA-256",
      cipher: "AES-GCM-256",
      iterations: vault.iterations,
      salt: vault.salt,
      iv: toBase64(iv),
      data: toBase64(new Uint8Array(data)),
    };
    this.repository.write(JSON.stringify(record));
    return vault;
  }

  private async deriveKey(
    password: string,
    salt: Uint8Array<ArrayBuffer>,
    iterations: number,
  ): Promise<CryptoKey> {
    const material = await this.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password.normalize("NFKC")),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return this.crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  try {
    return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  } catch {
    throw new VaultError("CORRUPT", "The stored vault is malformed.");
  }
}
