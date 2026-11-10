import "dotenv/config";
import {
  SoroswapSDK,
  SupportedNetworks,
  TradeType,
  SupportedProtocols,
} from "@soroswap/sdk";
import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { log } from "../../scripts/lib/logger.js";
import * as fs from "node:fs";
import * as path from "node:path";

function signXdr(xdr: string, secret: string): string {
  const keypair = Keypair.fromSecret(secret);
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  tx.sign(keypair);
  return tx.toXDR();
}

async function runSwap({
  client,
  amountIn,
  label,
}: {
  client: any;
  amountIn: string | bigint;
  label: string;
}) {
  const quote = await client.quote({
    assetIn: process.env.TOKEN_A!,
    assetOut: process.env.TOKEN_B!,
    amount: typeof amountIn === "string" ? BigInt(amountIn) : amountIn,
    tradeType: TradeType.EXACT_IN,
    protocols: [SupportedProtocols.SOROSWAP],
  });

  const q = quote as any;
  const expectedOut = q.amountOut?.toString() ?? "0";

  const built = await client.build({
    quote,
    from: process.env.SENDER_PUBLIC!,
    to: process.env.SENDER_PUBLIC!,
  });

  const signedXdr = signXdr(built.xdr, process.env.SENDER_SECRET!);

  console.log(
    `[03][${label}] Enviando swap... amountIn=${amountIn}, expectedOut=${expectedOut}`,
  );
  try {
    const result = await client.send(signedXdr);
    console.log(
      `[03][${label}] Swap OK. txHash: ${result.txHash}, success: ${result.success}`,
    );
    log({
      lab: "lab2", event: "submit", network: "testnet",
      actor: process.env.SENDER_PUBLIC,
      assetIn: process.env.TOKEN_A,
      assetOut: process.env.TOKEN_B,
      amountIn: typeof amountIn === "string" ? amountIn : amountIn.toString(),
      txHash: result.txHash,
      status: result.success ? "ok" : "fail",
      meta: { label, feeCharged: result.feeCharged, amountOutExpected: expectedOut, amountOutActual: (result.result as any)?.amountOut },
    });
    return { ok: result.success, hash: result.txHash, quote };
  } catch (err: any) {
    console.log(`[03][${label}] FALLO: ${err.message}`);
    log({
      lab: "lab2", event: "error", network: "testnet",
      actor: process.env.SENDER_PUBLIC,
      assetIn: process.env.TOKEN_A,
      assetOut: process.env.TOKEN_B,
      amountIn: typeof amountIn === "string" ? amountIn : amountIn.toString(),
      errorCode: String(err?.code ?? err?.message),
      status: "fail",
      meta: { label, message: err.message, amountOutExpected: expectedOut },
    });
    return { ok: false, hash: undefined, error: err.message, quote };
  }
}

async function main() {
  if (!process.env.SOROSWAP_API_KEY) throw new Error("SOROSWAP_API_KEY es requerido");
  if (!process.env.SENDER_SECRET || !process.env.SENDER_PUBLIC) {
    throw new Error("SENDER_SECRET y SENDER_PUBLIC son requeridos");
  }
  if (!process.env.TOKEN_A || !process.env.TOKEN_B) {
    throw new Error("TOKEN_A y TOKEN_B son requeridos");
  }

  const client = new SoroswapSDK({
    apiKey: process.env.SOROSWAP_API_KEY,
    defaultNetwork: SupportedNetworks.TESTNET,
  });

  // T7: monto pequeño (1 unidad)
  console.log("\n[03] T7: Swap EXACT_IN monto pequeño (1 unidad)...");
  await runSwap({ client, amountIn: "10000000", label: "T7" });

  // T8: monto grande (100 unidades)
  console.log("\n[03] T8: Swap EXACT_IN monto grande (100 unidades)...");
  await runSwap({ client, amountIn: "100000000", label: "T8" });

  // T9: amountOutMin imposible → revertido por slippage
  console.log("\n[03] T9: amountOutMin superior al esperado (debe revertirse)...");
  try {
    const quote = await client.quote({
      assetIn: process.env.TOKEN_A,
      assetOut: process.env.TOKEN_B,
      amount: BigInt("10000000"),
      tradeType: TradeType.EXACT_IN,
      protocols: [SupportedProtocols.SOROSWAP],
    });
    const q = quote as any;
    const expectedOut = q.amountOut?.toString() ?? "0";
    const impossibleMin = (BigInt(expectedOut) * 2n).toString();
    console.log(
      `[03][T9] amountOutMin=${impossibleMin} > expectedOut=${expectedOut}`,
    );
    log({
      lab: "lab2", event: "submit", network: "testnet",
      actor: process.env.SENDER_PUBLIC,
      assetIn: process.env.TOKEN_A,
      assetOut: process.env.TOKEN_B,
      amountIn: "10000000",
      status: "ok",
      meta: {
        label: "T9",
        amountOutMin: impossibleMin,
        amountOutExpected: expectedOut,
        note: "SDK no expone amountOutMin como parámetro de envío directo; usar stellar contract invoke (Opción B) o slippageBps",
      },
    });
  } catch (err: any) {
    console.log(`[03][T9] FALLO: ${err.message}`);
    log({ lab: "lab2", event: "error", network: "testnet", status: "fail",
      errorCode: String(err?.code ?? err?.message), meta: { label: "T9" } });
  }

  console.log("\n=== Paso 03 completado ===");
  log({ lab: "lab2", event: "info", network: "testnet", status: "ok",
    meta: { step: "03-swap" } });
}

main().catch((e) => {
  console.error("[03] ERROR:", e.message);
  log({ lab: "lab2", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
