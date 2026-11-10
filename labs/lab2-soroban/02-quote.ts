// labs/lab2-soroban/02-quote.ts
// Paso 2 del Lab 2: Obtener cotización (quote) para un swap EXACT_IN.
//
// Requiere en .env:
//   SOROSWAP_API_KEY=...
//   TOKEN_A=<contract_id token A>
//   TOKEN_B=<contract_id token B>
//
// Uso:
//   SOROSWAP_API_KEY=... TOKEN_A=... TOKEN_B=... npx ts-node labs/lab2-soroban/02-quote.ts

import {
  SoroswapSDK,
  SupportedNetworks,
  TradeType,
  SupportedProtocols,
} from "@soroswap/sdk";
import { loadEnvLab2, logger } from "./helpers";
import * as fs from "fs";
import * as path from "path";

const AMOUNT_IN = "10000000"; // 1 unidad con 7 decimales (ejemplo)

async function main(): Promise<void> {
  const env = loadEnvLab2();
  if (!env.SOROSWAP_API_KEY) {
    throw new Error("SOROSWAP_API_KEY es requerido en .env");
  }
  if (!env.TOKEN_A || !env.TOKEN_B) {
    throw new Error("TOKEN_A y TOKEN_B son requeridos en .env");
  }

  const client = new SoroswapSDK({
    apiKey: env.SOROSWAP_API_KEY,
    defaultNetwork: SupportedNetworks.TESTNET,
  });

  console.log("[02] Solicitando cotización EXACT_IN:");
  console.log("  assetIn :", env.TOKEN_A);
  console.log("  assetOut:", env.TOKEN_B);
  console.log("  amount  :", AMOUNT_IN);

  const quote = await client.quote({
    assetIn: env.TOKEN_A,
    assetOut: env.TOKEN_B,
    amount: BigInt(AMOUNT_IN),
    tradeType: TradeType.EXACT_IN,
    protocols: [SupportedProtocols.SOROSWAP],
  });

  const q = quote as any;
  console.log("[02] Cotización obtenida:");
  console.log("  amountIn       :", q.amountIn?.toString());
  console.log("  amountOut      :", q.amountOut?.toString());
  console.log("  otherAmountThreshold:", q.otherAmountThreshold?.toString());
  console.log("  priceImpactPct :", q.priceImpactPct);
  console.log("  routePlan      :", JSON.stringify(q.routePlan));
  console.log("  platform       :", q.platform);

  logger("lab2", "quote", {
    actor: env.SENDER_PUBLIC,
    assetIn: env.TOKEN_A,
    assetOut: env.TOKEN_B,
    amountIn: q.amountIn?.toString() ?? AMOUNT_IN,
    amountOut: q.amountOut?.toString(),
    otherAmountThreshold: q.otherAmountThreshold?.toString(),
    priceImpactPct: q.priceImpactPct,
    routePlan: q.routePlan,
    platform: q.platform,
    tradeType: "EXACT_IN",
    status: "ok",
  });

  // Guardar el quote para el siguiente paso (no es un secreto)
  const out = path.resolve(process.cwd(), "labs/lab2-soroban/.last-quote.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        assetIn: env.TOKEN_A,
        assetOut: env.TOKEN_B,
        amountIn: q.amountIn?.toString(),
        amountOut: q.amountOut?.toString(),
        otherAmountThreshold: q.otherAmountThreshold?.toString(),
        priceImpactPct: q.priceImpactPct,
        routePlan: q.routePlan,
        platform: q.platform,
        ts: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log("\n=== Paso 02 completado ===");
  logger("lab2", "end", { step: "02-quote", status: "ok" });
}

main().catch((err) => {
  console.error("[02] ERROR:", err.message);
  logger("lab2", "error", { step: "02-quote", errorCode: err.code, message: err.message });
  process.exit(1);
});
