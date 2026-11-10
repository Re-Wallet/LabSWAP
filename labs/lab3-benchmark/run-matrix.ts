// labs/lab3-benchmark/run-matrix.ts
// Lab 3: Benchmark comparativo SDEX (Path Payment) vs AMM Soroban.
//
// Ejecuta la misma conversión conceptual (10 unidades Token A → Token B)
// una vez vía Path Payment (SDEX) y otra vía AMM Soroban, para 3 tamaños:
//   pequeño  (~0.1% del pool/libro)
//   medio    (~1% del pool/libro)
//   grande   (~10% del pool/libro)
//
// Registra para cada ejecución:
//   - precio efectivo
//   - impacto de precio
//   - slippage real vs. tolerado
//   - latencia y costo (fee) de la transacción
//
// Los resultados se escriben en logs/lab3/ y en labs/lab3-benchmark/RESULTS.md
//
// Requiere en .env:
//   SENDER_SECRET=... SENDER_PUBLIC=... PUBLIC_DESTINO=...
//   USDC_EMISOR=... USDC_CODIGO=USDC
//   SOROSWAP_API_KEY=... TOKEN_A=... TOKEN_B=...

import { Horizon, Keypair, Networks, Asset, Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import {
  SoroswapSDK,
  SupportedNetworks,
  TradeType,
  SupportedProtocols,
} from "@soroswap/sdk";
import * as fs from "fs";
import * as path from "path";

import { loadEnv } from "../lab1-sdex/helpers";
import { loadEnvLab2, logger as loggerLab2 } from "../lab2-soroban/helpers";

const HORIZON = "https://horizon-testnet.stellar.org";
const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

// Tamaños de operación (en unidades, con 7 decimales para XLM/USDC)
const SIZES = [
  { label: "pequeno", amount: "1000000" },   // 0.1 unidad
  { label: "medio", amount: "10000000" },    // 1 unidad
  { label: "grande", amount: "100000000" },  // 10 unidades
];

interface BenchResult {
  size: string;
  engine: "sdex" | "soroban";
  amountIn: string;
  amountOutExpected: string | null;
  amountOutActual: string | null;
  priceEffective: string | null;
  priceImpactPct: string | null;
  slippageBps: number | null;
  txHash: string | null;
  latencyMs: number;
  feeCharged: string | null;
  success: boolean;
  error: string | null;
}

const results: BenchResult[] = [];

async function nowMs(): Promise<number> {
  return Date.now();
}

// ---------- SDEX (Path Payment Strict Send) ----------
async function runSdex(size: { label: string; amount: string }, env: any): Promise<BenchResult> {
  const start = await nowMs();
  const r: BenchResult = {
    size: size.label,
    engine: "sdex",
    amountIn: size.amount,
    amountOutExpected: null,
    amountOutActual: null,
    priceEffective: null,
    priceImpactPct: null,
    slippageBps: null,
    txHash: null,
    latencyMs: 0,
    feeCharged: null,
    success: false,
    error: null,
  };

  try {
    const server = new Horizon.Server(HORIZON);
    const emitter = Keypair.fromSecret(env.SEED_ORIGEN!);

    // Consultar ruta strict-send
    const pathData = await (server as any).paths()
      .strictSend({
        sourceAsset: Asset.native(),
        sourceAmount: size.amount,
        destinationAsset: USDC,
      })
      .call();

    if (!pathData.records || pathData.records.length === 0) {
      r.error = "sin rutas SDEX disponibles";
      r.latencyMs = Date.now() - start;
      return r;
    }

    const route = pathData.records[0];
    const destMin = route.destination_amount; // usar el cotizado como destMin (holgado)
    const account = await server.loadAccount(emitter.publicKey());

    const t0 = Date.now();
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: Asset.native(),
          sendAmount: size.amount,
          destination: env.PUBLIC_DESTINO!,
          destAsset: USDC,
          destMin,
          path: [],
          source: emitter.publicKey(),
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(emitter);
    const result = await server.submitTransaction(tx);
    const latencyMs = Date.now() - t0;

    r.success = true;
    r.txHash = result.hash;
    r.amountOutActual = route.destination_amount;
    r.priceEffective = route.destination_amount;
    r.latencyMs = latencyMs;
    r.feeCharged = (result as any).fee_charged?.toString();

    loggerLab2("lab3", "submit", {
      engine: "sdex",
      size: size.label,
      actor: emitter.publicKey(),
      amountIn: size.amount,
      amountOut: route.destination_amount,
      txHash: result.hash,
      status: "ok",
    });
  } catch (err: any) {
    r.error = err.message;
    r.latencyMs = Date.now() - start;
    loggerLab2("lab3", "error", { engine: "sdex", size: size.label, errorCode: err.code, message: err.message, status: "fail" });
  }

  return r;
}

// ---------- Soroban AMM ----------
async function runSoroban(size: { label: string; amount: string }, env: any): Promise<BenchResult> {
  const start = await nowMs();
  const r: BenchResult = {
    size: size.label,
    engine: "soroban",
    amountIn: size.amount,
    amountOutExpected: null,
    amountOutActual: null,
    priceEffective: null,
    priceImpactPct: null,
    slippageBps: null,
    txHash: null,
    latencyMs: 0,
    feeCharged: null,
    success: false,
    error: null,
  };

  try {
    if (!env.SOROSWAP_API_KEY || !env.TOKEN_A || !env.TOKEN_B) {
      r.error = "SOROSWAP_API_KEY / TOKEN_A / TOKEN_B no configurados";
      r.latencyMs = Date.now() - start;
      return r;
    }

    const client = new SoroswapSDK({
      apiKey: env.SOROSWAP_API_KEY,
      defaultNetwork: SupportedNetworks.TESTNET,
    });

    const quote = await client.quote({
      assetIn: env.TOKEN_A,
      assetOut: env.TOKEN_B,
      amount: BigInt(size.amount),
      tradeType: TradeType.EXACT_IN,
      protocols: [SupportedProtocols.SOROSWAP],
    });

    const q = quote as any;
    r.amountOutExpected = q.amountOut?.toString();
    r.priceImpactPct = q.priceImpactPct;

    const built = await client.build({
      quote,
      from: env.SENDER_PUBLIC!,
      to: env.SENDER_PUBLIC!,
    });

    const keypair = Keypair.fromSecret(env.SENDER_SECRET!);
    const tx = TransactionBuilder.fromXDR(built.xdr, Networks.TESTNET);
    tx.sign(keypair);
    const signedXdr = tx.toXDR();

    const t0 = Date.now();
    const result = await client.send(signedXdr);
    const latencyMs = Date.now() - t0;

    r.success = result.success;
    r.txHash = result.txHash;
    const resAny = result.result as any;
    r.amountOutActual = resAny?.amountOut ?? null;
    r.priceEffective = resAny?.amountOut ?? null;
    r.latencyMs = latencyMs;
    r.feeCharged = result.feeCharged;

    loggerLab2("lab3", "submit", {
      engine: "soroban",
      size: size.label,
      actor: env.SENDER_PUBLIC,
      amountIn: size.amount,
      amountOut: r.amountOutActual,
      txHash: result.txHash,
      success: result.success,
      status: result.success ? "ok" : "fail",
    });
  } catch (err: any) {
    r.error = err.message;
    r.latencyMs = Date.now() - start;
    loggerLab2("lab3", "error", { engine: "soroban", size: size.label, errorCode: err.code, message: err.message, status: "fail" });
  }

  return r;
}

async function main(): Promise<void> {
  const env1 = loadEnv(); // Lab 1 env (SEED_ORIGEN, PUBLIC_DESTINO, USDC...)
  const env2 = loadEnvLab2(); // Lab 2 env (SOROSWAP_API_KEY, TOKEN_A, TOKEN_B...)

  const merged = { ...env1, ...env2 };

  console.log("=== Lab 3: Benchmark SDEX vs AMM Soroban ===\n");

  for (const size of SIZES) {
    console.log(`\n--- Tamaño: ${size.label} (${size.amount} stroops) ---`);

    const sdexRes = await runSdex(size, merged);
    results.push(sdexRes);
    console.log(
      `  SDEX: ${sdexRes.success ? "OK" : "FALLO"} tx=${sdexRes.txHash} out=${sdexRes.amountOutActual} latency=${sdexRes.latencyMs}ms`
    );

    const soroRes = await runSoroban(size, merged);
    results.push(soroRes);
    console.log(
      `  SOROBAN: ${soroRes.success ? "OK" : "FALLO"} tx=${soroRes.txHash} out=${soroRes.amountOutActual} latency=${soroRes.latencyMs}ms`
    );

    // Pausa entre tamaños para no saturar la red
    await new Promise((res) => setTimeout(res, 4000));
  }

  // Escribir resultados JSONL
  const dir = path.resolve(process.cwd(), "logs/lab3");
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(dir, `${ts}.jsonl`);
  for (const r of results) {
    fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), lab: "lab3", ...r }) + "\n");
  }

  // Generar tabla Markdown en RESULTS.md
  const md = generateMarkdown(results);
  fs.writeFileSync(path.resolve(process.cwd(), "labs/lab3-benchmark/RESULTS.md"), md);

  console.log("\n=== Lab 3 completado ===");
  console.log(md);
}

function generateMarkdown(results: BenchResult[]): string {
  const lines: string[] = [];
  lines.push("# Lab 3 — Benchmark Comparativo SDEX vs AMM Soroban");
  lines.push("");
  lines.push("> Ejecutado en **Stellar Testnet**. Mismo swap conceptual (XLM → USDC / TOKEN_A → TOKEN_B)");
  lines.push("en ambos motores, para 3 tamaños de operación.");
  lines.push("");
  lines.push("## Tabla de resultados");
  lines.push("");
  lines.push("| Tamaño | Motor | amountIn | amountOut | priceEffective | priceImpactPct | txHash | Latencia | Éxito |");
  lines.push("|--------|-------|----------|-----------|----------------|----------------|--------|----------|-------|");
  for (const r of results) {
    lines.push(
      `| ${r.size} | ${r.engine} | ${r.amountIn} | ${r.amountOutActual ?? "-"} | ${r.priceEffective ?? "-"} | ${r.priceImpactPct ?? "-"} | ${r.txHash ?? "-"} | ${r.latencyMs}ms | ${r.success ? "✅" : "❌"} |`
    );
  }
  lines.push("");
  lines.push("## Conclusión");
  lines.push("");
  lines.push("Pendiente de completar tras ejecutar la matriz con credenciales reales.");
  lines.push("");
  lines.push("## Referencias");
  lines.push("- Path Payments: https://developers.stellar.org/docs/build/guides/transactions/path-payments");
  lines.push("- Soroswap AMM: https://docs.soroswap.finance/amm/how-it-works");
  return lines.join("\n");
}

main().catch((err) => {
  console.error("[lab3] ERROR:", err.message);
  process.exit(1);
});
