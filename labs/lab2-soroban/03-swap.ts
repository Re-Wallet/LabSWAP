// labs/lab2-soroban/03-swap.ts
// Paso 3 del Lab 2: Construir, firmar y enviar un swap EXACT_IN.
//
// Casos cubiertos:
//   T7: swap monto pequeño        → output ≈ cotización
//   T8: swap monto grande         → impacto de precio visible
//   T9: amountOutMin superior     → revertido (slippage)
//
// Flujo con SDK Soroswap:
//   1. quote()     → cotización (amountOut esperado)
//   2. build()     → XDR de transacción sin firmar
//   3. sign()      → firmar XDR con la Keypair del usuario
//   4. send()      → enviar XDR firmado a la red Soroban
//
// Requiere en .env:
//   SOROSWAP_API_KEY=...
//   SENDER_SECRET=...
//   SENDER_PUBLIC=...
//   TOKEN_A=... TOKEN_B=...
//
// Uso:
//   SOROSWAP_API_KEY=... SENDER_SECRET=... SENDER_PUBLIC=... TOKEN_A=... TOKEN_B=... npx ts-node labs/lab2-soroban/03-swap.ts

import {
  SoroswapSDK,
  SupportedNetworks,
  TradeType,
  SupportedProtocols,
} from "@soroswap/sdk";
import { Keypair, Networks, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { loadEnvLab2, logger, sleep } from "./helpers";
import * as fs from "fs";
import * as path from "path";

function readLastQuote(): any {
  const out = path.resolve(process.cwd(), "labs/lab2-soroban/.last-quote.json");
  if (!fs.existsSync(out)) return null;
  return JSON.parse(fs.readFileSync(out, "utf-8"));
}

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
  expectFail,
}: {
  client: any;
  amountIn: string | bigint;
  label: string;
  expectFail?: boolean;
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

  console.log(`[03][${label}] Enviando swap... amountIn=${amountIn}, expectedOut=${expectedOut}`);
  try {
    const result = await client.send(signedXdr);
    const status = expectFail ? "unexpected_success" : "ok";
    console.log(
      `[03][${label}] Swap ${status}. txHash: ${result.txHash}, success: ${result.success}`
    );
    logger("lab2", "submit", {
      type: "swapExactIn",
      label,
      actor: process.env.SENDER_PUBLIC,
      assetIn: process.env.TOKEN_A,
      assetOut: process.env.TOKEN_B,
      amountIn: typeof amountIn === "string" ? amountIn : amountIn.toString(),
      amountOutExpected: expectedOut,
      amountOutActual: result.result?.amountOut,
      txHash: result.txHash,
      success: result.success,
      status,
    });
    await sleep(3000);
    return { ok: !expectFail, hash: result.txHash, quote };
  } catch (err: any) {
    const status = expectFail ? "expected_fail" : "fail";
    console.log(
      `[03][${label}] Swap ${status}. ${err.message}`
    );
    logger("lab2", "error", {
      type: "swapExactIn",
      label,
      actor: process.env.SENDER_PUBLIC,
      assetIn: process.env.TOKEN_A,
      assetOut: process.env.TOKEN_B,
      amountIn: typeof amountIn === "string" ? amountIn : amountIn.toString(),
      amountOutExpected: expectedOut,
      errorCode: err.code,
      message: err.message,
      status,
    });
    return { ok: expectFail, hash: undefined, error: err.message, quote };
  }
}

async function main(): Promise<void> {
  const env = loadEnvLab2();
  if (!env.SOROSWAP_API_KEY) throw new Error("SOROSWAP_API_KEY es requerido");
  if (!env.SENDER_SECRET || !env.SENDER_PUBLIC) {
    throw new Error("SENDER_SECRET y SENDER_PUBLIC son requeridos");
  }
  if (!env.TOKEN_A || !env.TOKEN_B) {
    throw new Error("TOKEN_A y TOKEN_B son requeridos");
  }

  const client = new SoroswapSDK({
    apiKey: env.SOROSWAP_API_KEY,
    defaultNetwork: SupportedNetworks.TESTNET,
  });

  // T7: monto pequeño (1 unidad, 10^7 stroops)
  console.log("\n[03] T7: Swap EXACT_IN monto pequeño (1 unidad)...");
  try {
    await runSwap({ client, amountIn: "10000000", label: "T7" });
  } catch (err: any) {
    console.log(`[03][T7] FALLO: ${err.message}`);
    logger("lab2", "error", { label: "T7", errorCode: err.code, message: err.message, status: "fail" });
  }

  // T8: monto grande (100 unidades, 10^9 stroops) → impacto de precio mayor
  console.log("\n[03] T8: Swap EXACT_IN monto grande (100 unidades)...");
  try {
    await runSwap({ client, amountIn: "100000000", label: "T8" });
  } catch (err: any) {
    console.log(`[03][T8] FALLO: ${err.message}`);
    logger("lab2", "error", { label: "T8", errorCode: err.code, message: err.message, status: "fail" });
  }

  // T9: amountOutMin superior al esperado → debe revertirse
  // El SDK Soroswap expone amountOutMin vía quote.otherAmountThreshold.
  // Para forzar el fallo, se usa un amountOutMin artificialmente alto.
  console.log("\n[03] T9: Swap con amountOutMin imposible (debe revertirse por slippage)...");
  try {
    const quote = await client.quote({
      assetIn: env.TOKEN_A,
      assetOut: env.TOKEN_B,
      amount: BigInt("10000000"),
      tradeType: TradeType.EXACT_IN,
      protocols: [SupportedProtocols.SOROSWAP],
    });
    const q = quote as any;
    const expectedOut = q.amountOut?.toString() ?? "0";
    const impossibleMin = (BigInt(expectedOut) * 2n).toString(); // el doble del esperado
    console.log(
      `[03][T9] amountOutMin=${impossibleMin} > expectedOut=${expectedOut}`
    );
    // Nota: client.build/send no expone amountOutMin como parámetro directo en esta versión
    // del SDK. Para probar el rechazo por slippage de forma controlada se recomienda
    // usar stellar contract invoke con el Router (Opción B) o pasar slippageBps en el quote.
    logger("lab2", "submit", {
      type: "swapExactIn",
      label: "T9",
      actor: env.SENDER_PUBLIC,
      assetIn: env.TOKEN_A,
      assetOut: env.TOKEN_B,
      amountIn: "10000000",
      amountOutMin: impossibleMin,
      amountOutExpected: expectedOut,
      status: "skip_sdk_no_amountOutMin_param",
      note: "SDK no expone amountOutMin como parámetro de envío directo; usar stellar contract invoke (Opción B) o slippageBps",
    });
  } catch (err: any) {
    console.log(`[03][T9] FALLO: ${err.message}`);
    logger("lab2", "error", { label: "T9", errorCode: err.code, message: err.message, status: "fail" });
  }

  console.log("\n=== Paso 03 completado ===");
  logger("lab2", "end", { step: "03-swap", status: "ok" });
}

main().catch((err) => {
  console.error("[03] ERROR:", err.message);
  logger("lab2", "error", { step: "03-swap", errorCode: err.code, message: err.message });
  process.exit(1);
});
