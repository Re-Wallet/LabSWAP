// labs/lab1-sdex/helpers.ts
// Helpers compartidos para el Lab 1 (SDEX / Path Payments).
// - Logger JSONL estructurado (sin secretos).
// - Lectura segura de variables de entorno desde .env.
// - Construcción del servidor Horizon.

import * as fs from "fs";
import * as path from "path";

export interface Env {
  HORIZON_URL: string;
  NETWORK_PASSPHRASE: string;
  SEED_ORIGEN?: string;
  PUBLIC_ORIGEN?: string;
  SEED_DESTINO?: string;
  PUBLIC_DESTINO?: string;
  USDC_EMISOR: string;
  USDC_CODIGO: string;
}

export function loadEnv(): Env {
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
    HORIZON_URL: process.env.HORIZON_URL || "https://horizon-testnet.stellar.org",
    NETWORK_PASSPHRASE:
      process.env.SOROBAN_NETWORK_PASSPHRASE ||
      "Test SDF Network ; September 2015",
    SEED_ORIGEN: process.env.SEED_ORIGEN,
    PUBLIC_ORIGEN: process.env.PUBLIC_ORIGEN,
    SEED_DESTINO: process.env.SEED_DESTINO,
    PUBLIC_DESTINO: process.env.PUBLIC_DESTINO,
    USDC_EMISOR: process.env.USDC_EMISOR || "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    USDC_CODIGO: process.env.USDC_CODIGO || "USDC",
  };
}

let logFile: string | null = null;

/**
 * Escribe un evento JSONL en logs/<lab>/<timestamp>.jsonl.
 * Nunca escribe secretos (SEEDs ni API keys).
 */
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
  // eliminar campos sensibles por si acaso (tipado dinámico)
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
