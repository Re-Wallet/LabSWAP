// labs/lab2-soroban/04-verify.ts
// Paso 4 del Lab 2: Verificar balances on-chain y reservas del pool.
//
// Requiere:
//   SENDER_PUBLIC=...   (cuenta a consultar)
//   TOKEN_A=... TOKEN_B=... (contract ids de los tokens Soroban)
//
// Uso:
//   SENDER_PUBLIC=... TOKEN_A=... TOKEN_B=... npx ts-node labs/lab2-soroban/04-verify.ts

import { loadEnvLab2, logger } from "./helpers";

async function jsonRpc(url: string, method: string, params: any = {}): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`JSON-RPC: ${JSON.stringify(data.error)}`);
  return data.result;
}

async function main(): Promise<void> {
  const env = loadEnvLab2();
  if (!env.SENDER_PUBLIC) {
    throw new Error("SENDER_PUBLIC es requerido en .env");
  }

  console.log("[04] Verificando balances on-chain de la cuenta:", env.SENDER_PUBLIC);

  // Soroban RPC getBalance para un contrato token requiere el contract id y la cuenta
  // Usamos readContractData o getBalance según la versión del RPC.
  // Aquí intentamos getBalance con el token como contrato (si es Stellar Asset envuelto, usamos Horizon).

  if (env.TOKEN_A && env.TOKEN_B) {
    try {
      const balA = await jsonRpc(env.SOROBAN_RPC_URL, "getBalance", {
        contractId: env.TOKEN_A,
        account: env.SENDER_PUBLIC,
      });
      console.log(`  Balance TOKEN_A (${env.TOKEN_A}):`, JSON.stringify(balA));
      logger("lab2", "verify", {
        actor: env.SENDER_PUBLIC,
        token: env.TOKEN_A,
        balance: balA,
        status: "ok",
      });
    } catch (err: any) {
      console.warn(`  No se pudo leer balance TOKEN_A: ${err.message}`);
      logger("lab2", "warn", { token: env.TOKEN_A, message: err.message });
    }

    try {
      const balB = await jsonRpc(env.SOROBAN_RPC_URL, "getBalance", {
        contractId: env.TOKEN_B,
        account: env.SENDER_PUBLIC,
      });
      console.log(`  Balance TOKEN_B (${env.TOKEN_B}):`, JSON.stringify(balB));
      logger("lab2", "verify", {
        actor: env.SENDER_PUBLIC,
        token: env.TOKEN_B,
        balance: balB,
        status: "ok",
      });
    } catch (err: any) {
      console.warn(`  No se pudo leer balance TOKEN_B: ${err.message}`);
      logger("lab2", "warn", { token: env.TOKEN_B, message: err.message });
    }
  }

  // Reservas del pool (si se conoce el contract id del pool/pair)
  if (process.env.PAIR_ID) {
    try {
      const reserves = await jsonRpc(env.SOROBAN_RPC_URL, "getReserves", {
        contractId: process.env.PAIR_ID,
      });
      console.log("  Reservas del pool:", JSON.stringify(reserves));
      logger("lab2", "verify", {
        actor: env.SENDER_PUBLIC,
        pair: process.env.PAIR_ID,
        reserves,
        status: "ok",
      });
    } catch (err: any) {
      console.warn(`  No se pudieron leer reservas: ${err.message}`);
      logger("lab2", "warn", { pair: process.env.PAIR_ID, message: err.message });
    }
  }

  console.log("\n=== Paso 04 completado ===");
  logger("lab2", "end", { step: "04-verify", status: "ok" });
}

main().catch((err) => {
  console.error("[04] ERROR:", err.message);
  logger("lab2", "error", { step: "04-verify", errorCode: err.code, message: err.message });
  process.exit(1);
});
