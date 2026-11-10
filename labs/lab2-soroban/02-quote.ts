import "dotenv/config";
import {
  SoroswapSDK,
  SupportedNetworks,
  TradeType,
  SupportedProtocols,
} from "@soroswap/sdk";
import { log } from "../../scripts/lib/logger.js";
import * as fs from "node:fs";
import * as path from "node:path";

const AMOUNT_IN = "10000000"; // 1 unidad con 7 decimales

async function main() {
  if (!process.env.SOROSWAP_API_KEY) {
    throw new Error("SOROSWAP_API_KEY es requerido en .env");
  }
  if (!process.env.TOKEN_A || !process.env.TOKEN_B) {
    throw new Error("TOKEN_A y TOKEN_B son requeridos en .env");
  }

  const client = new SoroswapSDK({
    apiKey: process.env.SOROSWAP_API_KEY,
    defaultNetwork: SupportedNetworks.TESTNET,
  });

  console.log("[02] Solicitando cotización EXACT_IN:");
  console.log("  assetIn :", process.env.TOKEN_A);
  console.log("  assetOut:", process.env.TOKEN_B);
  console.log("  amount  :", AMOUNT_IN);

  const quote = await client.quote({
    assetIn: process.env.TOKEN_A,
    assetOut: process.env.TOKEN_B,
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

  log({
    lab: "lab2", event: "quote", network: "testnet",
    actor: process.env.SENDER_PUBLIC,
    assetIn: process.env.TOKEN_A,
    assetOut: process.env.TOKEN_B,
    amountIn: q.amountIn?.toString() ?? AMOUNT_IN,
    amountOut: q.amountOut?.toString(),
    priceMarginal: q.priceImpactPct,
    status: "ok",
    meta: {
      otherAmountThreshold: q.otherAmountThreshold?.toString(),
      routePlan: q.routePlan,
      platform: q.platform,
    },
  });

  const out = path.resolve(process.cwd(), "labs/lab2-soroban/.last-quote.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        assetIn: process.env.TOKEN_A,
        assetOut: process.env.TOKEN_B,
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
  log({ lab: "lab2", event: "info", network: "testnet", status: "ok",
    meta: { step: "02-quote" } });
}

main().catch((e) => {
  console.error("[02] ERROR:", e.message);
  log({ lab: "lab2", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
