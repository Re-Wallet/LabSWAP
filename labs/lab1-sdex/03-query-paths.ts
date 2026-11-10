import "dotenv/config";
import { Horizon, Asset } from "@stellar/stellar-sdk";
import { log } from "../../scripts/lib/logger.js";

const server = new Horizon.Server(process.env.HORIZON_URL!);
const USDC = new Asset("USDC", process.env.USDC_ISSUER!);

async function main() {
  // ---- Strict Send: ¿cuánto USDC recibo si envío 10 XLM? ----
  const ss = await server
    .strictSendPaths(Asset.native(), "10", [USDC])
    .call();
  console.log("\n=== STRICT SEND (10 XLM → USDC) ===");
  for (const r of ss.records) {
    console.log({
      destination_amount: r.destination_amount,
      path: r.path.map((p: any) => p.asset_code ?? "XLM"),
      source_amount: r.source_amount,
    });
  }
  log({
    lab: "lab1", event: "quote", network: "testnet",
    assetIn: "XLM", assetOut: "USDC", amountIn: "10",
    amountOut: ss.records[0]?.destination_amount ?? "0",
    status: ss.records.length > 0 ? "ok" : "fail",
    meta: { mode: "strict-send", pathsFound: ss.records.length },
  });

  // ---- Strict Receive: ¿cuánto XLM debo enviar para recibir 5 USDC? ----
  const sr = await server
    .strictReceivePaths([Asset.native()], USDC, "5")
    .call();
  console.log("\n=== STRICT RECEIVE (→ 5 USDC) ===");
  for (const r of sr.records) {
    console.log({
      source_amount: r.source_amount,
      path: r.path.map((p: any) => p.asset_code ?? "XLM"),
      destination_amount: r.destination_amount,
    });
  }
  log({
    lab: "lab1", event: "quote", network: "testnet",
    assetIn: "XLM", assetOut: "USDC", amountOut: "5",
    amountIn: sr.records[0]?.source_amount ?? "0",
    status: sr.records.length > 0 ? "ok" : "fail",
    meta: { mode: "strict-receive", pathsFound: sr.records.length },
  });
}

main().catch((e) => {
  console.error(e);
  log({ lab: "lab1", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
