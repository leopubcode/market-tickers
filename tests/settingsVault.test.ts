import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings, toMarketDataConfig, type Settings } from "../src/domain/settings/settings.ts";
import { VaultError } from "../src/domain/vault/vaultRecord.ts";
import { SettingsVaultService, VAULT_ITERATIONS } from "../src/services/SettingsVaultService.ts";
import { InMemorySettingsVaultRepository } from "../src/storage/SettingsVaultRepository/InMemorySettingsVaultRepository.ts";

const SETTINGS: Settings = {
  source: "alphavantage",
  apiKeys: { alphavantage: "SECRETKEY123", twelvedata: "TDKEY456" },
  premium: true,
};
const code = (c: string) => (e: unknown) => e instanceof VaultError && e.code === c;

// Few rounds keep the suite fast; the production count is checked separately.
const setup = () => {
  const repository = new InMemorySettingsVaultRepository();
  const service = new SettingsVaultService(repository, { iterations: 1000 }, globalThis.crypto);
  return { repository, service };
};

describe("SettingsVaultService", () => {
  it("uses 2 million PBKDF2 rounds by default", () => {
    assert.equal(VAULT_ITERATIONS, 2_000_000);
  });

  it("creates a vault that unlocks with the same password", async () => {
    const { service } = setup();
    assert.equal(service.exists(), false);
    await service.create("hunter22", SETTINGS);
    assert.equal(service.exists(), true);
    assert.deepEqual((await service.unlock("hunter22")).settings, SETTINGS);
  });

  it("stores no readable settings and a versioned record", async () => {
    const { service, repository } = setup();
    await service.create("hunter22", SETTINGS);
    const text = repository.read()!;
    assert.ok(!text.includes("SECRETKEY123"));
    const record = JSON.parse(text);
    assert.equal(record.version, 1);
    assert.equal(record.kdf, "PBKDF2-SHA-256");
    assert.equal(record.cipher, "AES-GCM-256");
    assert.equal(record.iterations, 1000);
    assert.equal(atob(record.salt).length, 16);
    assert.equal(atob(record.iv).length, 12);
  });

  it("uses a new salt for each vault and a new IV for each write", async () => {
    const a = setup();
    const b = setup();
    const first = await a.service.create("hunter22", SETTINGS);
    await b.service.create("hunter22", SETTINGS);
    const recordA = JSON.parse(a.repository.read()!);
    assert.notEqual(recordA.salt, JSON.parse(b.repository.read()!).salt);

    await a.service.save(first, { ...SETTINGS, premium: false });
    const saved = JSON.parse(a.repository.read()!);
    assert.equal(saved.salt, recordA.salt);
    assert.notEqual(saved.iv, recordA.iv);
  });

  it("rejects a wrong password", async () => {
    const { service } = setup();
    await service.create("hunter22", SETTINGS);
    await assert.rejects(service.unlock("hunter23"), code("WRONG_PASSWORD"));
  });

  it("requires at least 6 characters", async () => {
    const { service } = setup();
    await assert.rejects(service.create("12345", SETTINGS), code("PASSWORD_TOO_SHORT"));
    assert.equal(service.exists(), false);
    await service.create("123456", SETTINGS);
  });

  it("saves new settings that the same password unlocks", async () => {
    const { service } = setup();
    const vault = await service.create("hunter22", SETTINGS);
    const next = { ...DEFAULT_SETTINGS, source: "twelvedata" as const, apiKeys: { alphavantage: "", twelvedata: "K" } };
    await service.save(vault, next);
    assert.deepEqual((await service.unlock("hunter22")).settings, next);
  });

  it("detects a tampered record", async () => {
    const { service, repository } = setup();
    await service.create("hunter22", SETTINGS);
    const record = JSON.parse(repository.read()!);
    const bytes = Uint8Array.from(atob(record.data), (c) => c.charCodeAt(0));
    bytes[0] ^= 1;
    record.data = btoa(String.fromCharCode(...bytes));
    repository.write(JSON.stringify(record));
    await assert.rejects(service.unlock("hunter22"), code("WRONG_PASSWORD"));
  });

  it("rejects unreadable and future records", async () => {
    const { service, repository } = setup();
    repository.write("nope");
    await assert.rejects(service.unlock("hunter22"), code("CORRUPT"));
    repository.write(JSON.stringify({ version: 2 }));
    await assert.rejects(service.unlock("hunter22"), code("UNSUPPORTED"));
  });

  it("refuses live settings without an API key, and erases", async () => {
    const { service } = setup();
    await assert.rejects(service.create("hunter22", { ...SETTINGS, apiKeys: { ...SETTINGS.apiKeys, alphavantage: " " } }), /API key/);
    await service.create("hunter22", SETTINGS);
    service.erase();
    assert.equal(service.exists(), false);
  });
});

describe("toMarketDataConfig", () => {
  it("passes only the selected provider's key and hides keys from mock", () => {
    assert.deepEqual(toMarketDataConfig(SETTINGS), {
      source: "alphavantage",
      apiKey: "SECRETKEY123",
      fullHistory: true,
    });
    assert.equal(toMarketDataConfig({ ...SETTINGS, source: "twelvedata" }).apiKey, "TDKEY456");
    assert.equal(toMarketDataConfig({ ...SETTINGS, source: "mock" }).apiKey, undefined);
  });

  it("gates full history behind premium for Alpha Vantage only", () => {
    const free = { ...SETTINGS, premium: false };
    assert.equal(toMarketDataConfig(free).fullHistory, false);
    assert.equal(toMarketDataConfig({ ...free, source: "twelvedata" }).fullHistory, true);
  });
});

describe("parseSettings", () => {
  it("upgrades a vault saved with the single Alpha Vantage key", () => {
    assert.deepEqual(parseSettings({ source: "live", apiKey: "OLD", premium: true }), {
      source: "alphavantage",
      apiKeys: { alphavantage: "OLD", twelvedata: "" },
      premium: true,
    });
    assert.equal(parseSettings({ source: "mock", apiKey: "", premium: false }).source, "mock");
  });

  it("rejects an unknown source", () => {
    assert.throws(() => parseSettings({ ...SETTINGS, source: "yahoo" }), /malformed/);
  });
});
