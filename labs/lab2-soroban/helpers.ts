// labs/lab2-soroban/helpers.ts
// Helpers compartidos para el Lab 2 (AMM Soroban / Soroswap).
// - Logger JSONL estructurado (sin secretos ni API keys).
// - Lectura segura de .env.

import * as fs from "fs";
import * as path from "path";

export interface EnvLab2 {
  SOROBAN_RPC_URL: string;
  SOROBAN_NETWORK_PASSPHRASE: string;
  SENDER_SECRET?: string;
  SENDER_PUBLIC?: string;
  SOROSWAP_API_KEY?: string;
  TOKEN_A?: string;
  TOKEN_B?: string;
}

export function loadEnvLab2(): EnvLab2 {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
  return {
    SOROBAN_RPC_URL: process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
    SOROBAN_NETWORK_PASSPHRASE:
      process.env.SOROBAN_NETWORK_PASSPHRASE ||
      "Test SDF Network ; September 2015",
    SENDER_SECRET: process.env.SENDER_SECRET,
    SENDER_PUBLIC: process.env.SENDER_PUBLIC,
    SOROSWAP_API_KEY: process.env.SOROSWAP_API_KEY || process.env.SOROSWAP_CLAVE,
    TOKEN_A: process.env.TOKEN_A,
    TOKEN_B: process.env.TOKEN_B,
  };
}

let logFile: string | null = null;

export function logger(lab: string, event: string, fields: Record<string, any> = {}): void {
  const dir = path.resolve(process.cwd(), "logs", lab);
  fs.mkdirSync(dir, { recursive: true });
  if (!logFile) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    logFile = path.join(dir, `${ts}.jsonl`);
  }
  const entry = {
    ts: new Date().toISOString(),
    lab,
    event,
    network: "testnet",
    ...fields,
  };
  const e = entry as Record<string, any>;
  delete e.seed;
  delete e.secret;
  delete e.apiKey;
  delete e.clave;
  fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
