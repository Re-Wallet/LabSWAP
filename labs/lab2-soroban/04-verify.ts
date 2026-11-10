import "dotenv/config";
import { log } from "../../scripts/lib/logger.js";

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

async function main() {
  if (!process.env.SENDER_PUBLIC) {
    throw new Error("SENDER_PUBLIC es requerido en .env");
  }

  console.log("[04] Verificando balances on-chain de la cuenta:", process.env.SENDER_PUBLIC);

  if (process.env.TOKEN_A && process.env.TOKEN_B) {
    for (const token of [process.env.TOKEN_A, process.env.TOKEN_B]) {
      try {
        const bal = await jsonRpc(process.env.SOROBAN_RPC_URL!, "getBalance", {
          contractId: token,
          account: process.env.SENDER_PUBLIC,
        });
        console.log(`  Balance ${token}:`, JSON.stringify(bal));
        log({
          lab: "lab2", event: "verify", network: "testnet",
          actor: process.env.SENDER_PUBLIC, status: "ok",
          meta: { token, balance: bal },
        });
      } catch (err: any) {
        console.warn(`  No se pudo leer balance ${token}: ${err.message}`);
        log({
          lab: "lab2", event: "error", network: "testnet", status: "fail",
          meta: { token, message: err.message },
        });
      }
    }
  }

  if (process.env.PAIR_ID) {
    try {
      const reserves = await jsonRpc(process.env.SOROBAN_RPC_URL!, "getReserves", {
        contractId: process.env.PAIR_ID,
      });
      console.log("  Reservas del pool:", JSON.stringify(reserves));
      log({
        lab: "lab2", event: "verify", network: "testnet",
        actor: process.env.SENDER_PUBLIC, status: "ok",
        meta: { pair: process.env.PAIR_ID, reserves },
      });
    } catch (err: any) {
      console.warn(`  No se pudieron leer reservas: ${err.message}`);
      log({
        lab: "lab2", event: "error", network: "testnet", status: "fail",
        meta: { pair: process.env.PAIR_ID, message: err.message },
      });
    }
  }

  console.log("\n=== Paso 04 completado ===");
  log({ lab: "lab2", event: "info", network: "testnet", status: "ok",
    meta: { step: "04-verify" } });
}

main().catch((e) => {
  console.error("[04] ERROR:", e.message);
  log({ lab: "lab2", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
