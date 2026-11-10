import "dotenv/config";
import { Horizon, Keypair, Asset, Operation, TransactionBuilder, BASE_FEE, Networks } from "@stellar/stellar-sdk";
import {
  SoroswapSDK,
  SupportedNetworks,
  TradeType,
  SupportedProtocols,
} from "@soroswap/sdk";
import { log } from "../../scripts/lib/logger.js";
import * as fs from "node:fs";
import * as path from "node:path";

const HORIZON = "https://horizon-testnet.stellar.org";
const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

const SIZES = [
  { label: "pequeno", amount: "1000000" },
  { label: "medio", amount: "10000000" },
  { label: "grande", amount: "100000000" },
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

async function runSdex(size: { label: string; amount: string }, env: any): Promise<BenchResult> {
  const start = Date.now();
  const r: BenchResult = {
    size: size.label, engine: "sdex", amountIn: size.amount,
    amountOutExpected: null, amountOutActual: null, priceEffective: null,
    priceImpactPct: null, slippageBps: null, txHash: null, latencyMs: 0,
    feeCharged: null, success: false, error: null,
  };
  try {
    const server = new Horizon.Server(HORIZON);
    const emitter = Keypair.fromSecret(env.SEED_ORIGEN!);
    const pathData: any = await (server as any).paths().strictSend({
      sourceAsset: Asset.native(),
      sourceAmount: size.amount,
      destinationAsset: USDC,
    }).call();
    if (!pathData.records || pathData.records.length === 0) {
      r.error = "sin rutas SDEX disponibles";
      r.latencyMs = Date.now() - start;
      return r;
    }
    const route = pathData.records[0];
    const destMin = route.destination_amount;
    const account = await server.loadAccount(emitter.publicKey());
    const t0 = Date.now();
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE, networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(), sendAmount: size.amount,
        destination: env.PUBLIC_DESTINO!, destAsset: USDC, destMin, path: [],
        source: emitter.publicKey(),
      }))
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
    log({ lab: "lab3", event: "submit", network: "testnet",
      actor: emitter.publicKey(), amountIn: size.amount,
      amountOut: route.destination_amount, txHash: result.hash, status: "ok",
      meta: { engine: "sdex", size: size.label } });
  } catch (err: any) {
    r.error = err.message;
    r.latencyMs = Date.now() - start;
    log({ lab: "lab3", event: "error", network: "testnet",
      errorCode: String(err?.code ?? err?.message),
      status: "fail", meta: { engine: "sdex", size: size.label, message: err.message } });
  }
  return r;
}

async function runSoroban(size: { label: string; amount: string }, env: any): Promise<BenchResult> {
  const start = Date.now();
  const r: BenchResult = {
    size: size.label, engine: "soroban", amountIn: size.amount,
    amountOutExpected: null, amountOutActual: null, priceEffective: null,
    priceImpactPct: null, slippageBps: null, txHash: null, latencyMs: 0,
    feeCharged: null, success: false, error: null,
  };
  try {
    if (!env.SOROSWAP_API_KEY || !env.TOKEN_A || !env.TOKEN_B) {
      r.error = "SOROSWAP_API_KEY / TOKEN_A / TOKEN_B no configurados";
      r.latencyMs = Date.now() - start;
      return r;
    }
    const client = new SoroswapSDK({
      apiKey: env.SOROSWAP_API_KEY, defaultNetwork: SupportedNetworks.TESTNET,
    });
    const quote = await client.quote({
      assetIn: env.TOKEN_A, assetOut: env.TOKEN_B, amount: BigInt(size.amount),
      tradeType: TradeType.EXACT_IN, protocols: [SupportedProtocols.SOROSWAP],
    });
    const q = quote as any;
    r.amountOutExpected = q.amountOut?.toString();
    r.priceImpactPct = q.priceImpactPct;
    const built = await client.build({ quote, from: env.SENDER_PUBLIC!, to: env.SENDER_PUBLIC! });
    const keypair = Keypair.fromSecret(env.SENDER_SECRET!);
    const tx = TransactionBuilder.fromXDR(built.xdr, Networks.TESTNET);
    tx.sign(keypair);
    const signedXdr = tx.toXDR();
    const t0 = Date.now();
    const result = await client.send(signedXdr);
    const latencyMs = Date.now() - t0;
    const resAny = result.result as any;
    r.success = result.success;
    r.txHash = result.txHash;
    r.amountOutActual = resAny?.amountOut ?? null;
    r.priceEffective = resAny?.amountOut ?? null;
    r.latencyMs = latencyMs;
    r.feeCharged = result.feeCharged;
    log({ lab: "lab3", event: "submit", network: "testnet",
      actor: env.SENDER_PUBLIC, amountIn: size.amount,
      amountOut: r.amountOutActual ?? undefined, txHash: result.txHash,
      status: result.success ? "ok" : "fail",
      meta: { engine: "soroban", size: size.label, success: result.success } });
  } catch (err: any) {
    r.error = err.message;
    r.latencyMs = Date.now() - start;
    log({ lab: "lab3", event: "error", network: "testnet",
      errorCode: String(err?.code ?? err?.message),
      status: "fail",
      meta: { engine: "soroban", size: size.label, message: err.message } });
  }
  return r;
}

async function main() {
  const env1: any = {};
  const env2: any = {};
  // Leer .env manualmente si dotenv no lo expone todo (tipo module)
  for (const k of ["SEED_ORIGEN","PUBLIC_DESTINO","USDC_ISSUER","USDC_CODIGO",
    "SOROSWAP_API_KEY","TOKEN_A","TOKEN_B","SENDER_SECRET","SENDER_PUBLIC"]) {
    if (process.env[k]) {
      (k.startsWith("SEED") || k.startsWith("PUBLIC") || k.startsWith("USDC") ? env1 : env2)[k] = process.env[k];
    }
  }
  const merged = { ...env1, ...env2 };

  console.log("=== Lab 3: Benchmark SDEX vs AMM Soroban ===\n");
  for (const size of SIZES) {
    console.log(`\n--- Tamaño: ${size.label} (${size.amount} stroops) ---`);
    const sdexRes = await runSdex(size, merged);
    results.push(sdexRes);
    console.log(`  SDEX: ${sdexRes.success ? "OK" : "FALLO"} tx=${sdexRes.txHash} out=${sdexRes.amountOutActual} latency=${sdexRes.latencyMs}ms`);
    const soroRes = await runSoroban(size, merged);
    results.push(soroRes);
    console.log(`  SOROBAN: ${soroRes.success ? "OK" : "FALLO"} tx=${soroRes.txHash} out=${soroRes.amountOutActual} latency=${soroRes.latencyMs}ms`);
    await new Promise((res) => setTimeout(res, 4000));
  }

  const dir = path.resolve(process.cwd(), "logs/lab3");
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(dir, `${ts}.jsonl`);
  for (const r of results) {
    fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), lab: "lab3", ...r }) + "\n");
  }

  const md = [
    "# Lab 3 — Benchmark Comparativo SDEX vs AMM Soroban",
    "",
    "> Ejecutado en Stellar Testnet. Mismo swap conceptual en ambos motores, 3 tamaños.",
    "",
    "| Tamaño | Motor | amountIn | amountOut | priceEffective | priceImpactPct | txHash | Latencia | Éxito |",
    "|--------|-------|----------|-----------|----------------|----------------|--------|----------|-------|",
    ...results.map((r) =>
      `| ${r.size} | ${r.engine} | ${r.amountIn} | ${r.amountOutActual ?? "-"} | ${r.priceEffective ?? "-"} | ${r.priceImpactPct ?? "-"} | ${r.txHash ?? "-"} | ${r.latencyMs}ms | ${r.success ? "✅" : "❌"} |`),
    "",
    "## Conclusión",
    "",
    "Pendiente de completar tras ejecutar con credenciales reales.",
  ].join("\n");
  fs.writeFileSync(path.resolve(process.cwd(), "labs/lab3-benchmark/RESULTS.md"), md);
  console.log("\n=== Lab 3 completado ===");
  console.log(md);
}

main().catch((e) => {
  console.error("[lab3] ERROR:", e.message);
  process.exit(1);
});
