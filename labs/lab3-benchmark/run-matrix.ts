import "dotenv/config";
import { Horizon, Keypair, Asset, Operation, TransactionBuilder, BASE_FEE, Networks } from "@stellar/stellar-sdk";
import { log } from "../../scripts/lib/logger.js";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const HORIZON = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const RECEIVER = "GDJ4PYYCQGDXLJPNSPHESUCCNZ6O2MDERUVTVKT5GLSDEKZMH2H3UVK4";
const USDC_CODE = "USDC";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

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

function stellarContractInvoke(contractId: string, fn: string, args: Record<string, string>): { ok: boolean; txHash?: string; result?: string; error?: string } {
  const argParts: string[] = [];
  for (const [k, v] of Object.entries(args)) {
    const kebabKey = k.replace(/_/g, "-");
    argParts.push(`--${kebabKey}`, v);
  }
  try {
    const out = execSync(
      `stellar contract invoke --id ${contractId} --source labzk-soroban-testnet --network testnet --network-passphrase '${NETWORK_PASSPHRASE}' -- ${fn} ${argParts.join(" ")}`,
      { encoding: "utf8", timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
    );
    const clean = out.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    // Buscar tx hash en cualquier parte de la salida
    const txMatch = clean.match(/([a-f0-9]{64})/);
    const resultMatch = clean.match(/^(".*"|\d+|\{.*\})\s*$/m);
    return {
      ok: true,
      txHash: txMatch?.[1],
      result: resultMatch?.[1]?.replace(/^"|"$/g, ""),
    };
  } catch (err: any) {
    return { ok: false, error: err.stderr?.toString() || err.message };
  }
}

async function horizonStrictSend(amount: string): Promise<{ amountOut: string | null; error: string | null }> {
  try {
    const url = `${HORIZON}/paths/strict-send` +
      `?source_asset_type=native` +
      `&source_amount=${encodeURIComponent(amount)}` +
      `&destination_asset_type=credit_alphanum4` +
      `&destination_asset_code=${encodeURIComponent(USDC_CODE)}` +
      `&destination_asset_issuer=${encodeURIComponent(USDC_ISSUER)}` +
      `&destination_account=${encodeURIComponent(RECEIVER)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) {
      return { amountOut: null, error: `HTTP ${res.status}` };
    }
    const data: any = await res.json();
    const records: any[] = data._embedded?.records ?? [];
    const usdcRoute = records.find((r: any) => r.destination_asset_code === USDC_CODE);
    if (!usdcRoute) {
      return { amountOut: null, error: "sin rutas USDC" };
    }
    return { amountOut: usdcRoute.destination_amount, error: null };
  } catch (err: any) {
    return { amountOut: null, error: err.message };
  }
}

async function runSdex(size: { label: string; amount: string }, env: any): Promise<BenchResult> {
  const start = Date.now();
  const r: BenchResult = {
    size: size.label, engine: "sdex", amountIn: size.amount,
    amountOutExpected: null, amountOutActual: null, priceEffective: null,
    priceImpactPct: null, slippageBps: null, txHash: null, latencyMs: 0,
    feeCharged: null, success: false, error: null,
  };
  try {
    const quote = await horizonStrictSend(size.amount);
    if (quote.error || !quote.amountOut) {
      r.error = quote.error || "sin ruta";
      r.latencyMs = Date.now() - start;
      return r;
    }

    const server = new Horizon.Server(HORIZON);
    const emitter = Keypair.fromSecret(env.SEED_ORIGEN!);
    const USDC = new Asset(USDC_CODE, USDC_ISSUER);
    const account = await server.loadAccount(emitter.publicKey());
    const destMin = quote.amountOut;

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
    r.amountOutActual = quote.amountOut;
    r.priceEffective = quote.amountOut;
    r.latencyMs = latencyMs;
    r.feeCharged = (result as any).fee_charged?.toString();

    log({ lab: "lab3", event: "submit", network: "testnet",
      actor: emitter.publicKey(), amountIn: size.amount,
      amountOut: quote.amountOut, txHash: result.hash, status: "ok",
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
    if (!env.AMM_CONTRACT_ID || !env.TOKEN_A || !env.TOKEN_B) {
      r.error = "AMM_CONTRACT_ID / TOKEN_A / TOKEN_B no configurados";
      r.latencyMs = Date.now() - start;
      return r;
    }

    const priceBefore = stellarContractInvoke(env.AMM_CONTRACT_ID, "get_price", {
      token_a: env.TOKEN_A,
      token_b: env.TOKEN_B,
    });

    const t0 = Date.now();
    const swapResult = stellarContractInvoke(env.AMM_CONTRACT_ID, "swap", {
      token_in: env.TOKEN_A,
      token_out: env.TOKEN_B,
      amount_in: size.amount,
      amount_out_min: "0",
    });
    const latencyMs = Date.now() - t0;

    if (!swapResult.ok) {
      r.error = swapResult.error || "swap falló";
      r.latencyMs = latencyMs;
      return r;
    }

    r.success = true;
    r.txHash = swapResult.txHash ?? null;
    r.amountOutActual = swapResult.result ?? null;
    r.priceEffective = swapResult.result ?? null;
    r.latencyMs = latencyMs;

    const priceAfter = stellarContractInvoke(env.AMM_CONTRACT_ID, "get_price", {
      token_a: env.TOKEN_A,
      token_b: env.TOKEN_B,
    });

    try {
      const pb = parseFloat(priceBefore.result ?? "0");
      const pa = parseFloat(priceAfter.result ?? "0");
      if (pb > 0) {
        r.priceImpactPct = ((pa - pb) / pb * 100).toFixed(4);
      }
    } catch {}

    log({ lab: "lab3", event: "submit", network: "testnet",
      actor: env.SENDER_PUBLIC, amountIn: size.amount,
      amountOut: swapResult.result ?? undefined, txHash: swapResult.txHash,
      status: "ok",
      meta: { engine: "soroban", size: size.label, priceBefore: priceBefore.result, priceAfter: priceAfter.result } });
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
  const env: any = {};
  for (const k of ["SEED_ORIGEN","PUBLIC_DESTINO","USDC_ISSUER","USDC_CODIGO",
    "AMM_CONTRACT_ID","TOKEN_A","TOKEN_B","SENDER_SECRET","SENDER_PUBLIC"]) {
    if (process.env[k]) env[k] = process.env[k];
  }

  console.log("=== Lab 3: Benchmark SDEX vs AMM Soroban ===\n");
  for (const size of SIZES) {
    console.log(`\n--- Tamaño: ${size.label} (${size.amount} stroops) ---`);
    const sdexRes = await runSdex(size, env);
    results.push(sdexRes);
    console.log(`  SDEX: ${sdexRes.success ? "OK" : "FALLO"} tx=${sdexRes.txHash} out=${sdexRes.amountOutActual} latency=${sdexRes.latencyMs}ms`);
    const soroRes = await runSoroban(size, env);
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
    "- **SDEX**: precio depende de la profundidad del libro de órdenes en ese instante.",
    "- **AMM Soroban**: precio dictado por la fórmula x*y=k con fee 0.30%, predecible y determinista.",
    "- El impacto de precio crece con el tamaño de la operación relativa a las reservas/libro.",
  ].join("\n");
  fs.writeFileSync(path.resolve(process.cwd(), "labs/lab3-benchmark/RESULTS.md"), md);
  console.log("\n=== Lab 3 completado ===");
  console.log(md);
}

main().catch((e) => {
  console.error("[lab3] ERROR:", e.message);
  process.exit(1);
});
