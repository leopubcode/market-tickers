/** What is stored: everything needed to decrypt except the password. */
export interface VaultRecord {
  version: 1;
  kdf: "PBKDF2-SHA-256";
  cipher: "AES-GCM-256";
  iterations: number;
  /** Base64 of the random salt, new for each vault. */
  salt: string;
  /** Base64 of the random IV, new for each write. */
  iv: string;
  /** Base64 of the encrypted settings, including the GCM tag. */
  data: string;
}

export type VaultErrorCode = "PASSWORD_TOO_SHORT" | "WRONG_PASSWORD" | "CORRUPT" | "UNSUPPORTED";

export class VaultError extends Error {
  readonly code: VaultErrorCode;

  constructor(code: VaultErrorCode, message: string) {
    super(message);
    this.name = "VaultError";
    this.code = code;
  }
}

export const MIN_PASSWORD_LENGTH = 6;

/**
 * Reads a stored record. A future layout gets a new `version`; keep reading
 * the old one here so existing vaults still unlock.
 */
export function parseVaultRecord(text: string): VaultRecord {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new VaultError("CORRUPT", "The stored vault is not readable.");
  }
  if (typeof raw !== "object" || raw === null) {
    throw new VaultError("CORRUPT", "The stored vault is not readable.");
  }
  if (raw.version !== 1) {
    throw new VaultError("UNSUPPORTED", `Vault version ${String(raw.version)} is not supported.`);
  }
  const { iterations, salt, iv, data } = raw;
  if (
    raw.kdf !== "PBKDF2-SHA-256" ||
    raw.cipher !== "AES-GCM-256" ||
    typeof iterations !== "number" ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    typeof salt !== "string" ||
    typeof iv !== "string" ||
    typeof data !== "string"
  ) {
    throw new VaultError("CORRUPT", "The stored vault is malformed.");
  }
  return { version: 1, kdf: raw.kdf, cipher: raw.cipher, iterations, salt, iv, data };
}
