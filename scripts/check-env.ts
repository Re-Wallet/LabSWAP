/**
 * scripts/check-env.ts
 *
 * Valida la conectividad con Horizon Testnet y Soroban RPC Testnet.
 * No usa secretos. Solo hace peticiones GET públicas.
 *
 * Uso: npx ts-node scripts/check-env.ts
 */

import { Horizon } from "@stellar/stellar-sdk";

const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${url}`);
  return res.json();
}

async function checkHorizon(): Promise<void> {
  console.log(`[check-env] Consultando Horizon: ${HORIZON_URL}`);
  const root = await fetchJson(`${HORIZON_URL}/`);
  console.log(`[check-env] Horizon OK. Horizon version: ${root.horizon_version || "n/a"}`);
  console.log(`[check-env] Network passthrough: ${root.history_latest_ledger ? "ledger " + root.history_latest_ledger : "n/a"}`);
}

async function jsonRpc(url: string, method: string, params: any = []): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${url}`);
  const data = await res.json();
  if (data.error) throw new Error(`JSON-RPC error: ${JSON.stringify(data.error)}`);
  return data.result;
}

async function checkSorobanRpc(): Promise<void> {
  console.log(`[check-env] Consultando Soroban RPC (JSON-RPC): ${SOROBAN_RPC_URL}`);
  const ledger = await jsonRpc(SOROBAN_RPC_URL, "getLatestLedger", {});
  console.log(
    `[check-env] Soroban RPC OK. latest ledger: ${ledger.ledger_sequence ?? ledger.sequence ?? JSON.stringify(ledger).slice(0, 120)}`
  );
}

async function main(): Promise<void> {
  console.log("=== check-env: validando conectividad Testnet ===\n");
  let ok = true;

  try {
    await checkHorizon();
  } catch (err: any) {
    ok = false;
    console.error(`[check-env] Horizon FALLO: ${err.message}`);
  }

  console.log("");

  try {
    await checkSorobanRpc();
  } catch (err: any) {
    ok = false;
    console.error(`[check-env] Soroban RPC FALLO: ${err.message}`);
  }

  console.log("\n=== Resultado ===");
  if (ok) {
    console.log("OK: todo el entorno base está conectado.");
    process.exit(0);
  } else {
    console.error("FALLO: revisar conectividad y variables de entorno.");
    process.exit(1);
  }
}

main();
