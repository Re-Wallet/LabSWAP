// labs/lab1-sdex/04-path-payment.ts
// Paso 4 del Lab 1: Ejecutar Path Payment en ambos modos.
//
// Casos cubiertos:
//   T1: strict send con destMin holgado        → éxito
//   T2: strict send con destMin imposible      → debe fallar (slippage)
//   T3: strict receive con sendMax holgado     → éxito
//   T4: strict receive con sendMax insuficiente → debe fallar (slippage)
//
// Uso:
//   SEED_ORIGEN=... PUBLIC_ORIGEN=... PUBLIC_DESTINO=... npx ts-node labs/lab1-sdex/04-path-payment.ts

import { Horizon, Keypair, Networks, Asset, Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { loadEnv, logger, sleep } from "./helpers";

const serverUrl = (env: any) => new Horizon.Server(env.HORIZON_URL);

async function submitPathPaymentStrictSend({
  emitter,
  server,
  USDC,
  destPublic,
  sendAmount,
  destMin,
  label,
}: {
  emitter: Keypair;
  server: Horizon.Server;
  USDC: Asset;
  destPublic: string;
  sendAmount: string;
  destMin: string;
  label: string;
}) {
  const account = await server.loadAccount(emitter.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount,
        destination: destPublic,
        destAsset: USDC,
        destMin,
        path: [],
        source: emitter.publicKey(),
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(emitter);
  try {
    const result = await server.submitTransaction(tx);
    console.log(`[04][${label}] strict-send OK. txHash: ${result.hash}`);
    logger("lab1", "submit", {
      type: "pathPaymentStrictSend",
      label,
      actor: emitter.publicKey(),
      destination: destPublic,
      sendAsset: "XLM:native",
      sendAmount,
      destAsset: `USDC:${USDC.issuer}`,
      destMin,
      txHash: result.hash,
      status: "ok",
    });
    return { ok: true, hash: result.hash };
  } catch (err: any) {
    console.log(`[04][${label}] strict-send FALLO (esperado si slippage): ${err.message}`);
    logger("lab1", "submit", {
      type: "pathPaymentStrictSend",
      label,
      actor: emitter.publicKey(),
      destination: destPublic,
      sendAsset: "XLM:native",
      sendAmount,
      destAsset: `USDC:${USDC.issuer}`,
      destMin,
      errorCode: err.code,
      message: err.message,
      status: "fail",
    });
    return { ok: false, error: err.message };
  }
}

async function submitPathPaymentStrictReceive({
  emitter,
  server,
  USDC,
  destPublic,
  destAmount,
  sendMax,
  label,
}: {
  emitter: Keypair;
  server: Horizon.Server;
  USDC: Asset;
  destPublic: string;
  destAmount: string;
  sendMax: string;
  label: string;
}) {
  const account = await server.loadAccount(emitter.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax,
        destination: destPublic,
        destAsset: USDC,
        destAmount,
        path: [],
        source: emitter.publicKey(),
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(emitter);
  try {
    const result = await server.submitTransaction(tx);
    console.log(`[04][${label}] strict-receive OK. txHash: ${result.hash}`);
    logger("lab1", "submit", {
      type: "pathPaymentStrictReceive",
      label,
      actor: emitter.publicKey(),
      destination: destPublic,
      sendAsset: "XLM:native",
      sendMax,
      destAsset: `USDC:${USDC.issuer}`,
      destAmount,
      txHash: result.hash,
      status: "ok",
    });
    return { ok: true, hash: result.hash };
  } catch (err: any) {
    console.log(`[04][${label}] strict-receive FALLO (esperado si slippage): ${err.message}`);
    logger("lab1", "submit", {
      type: "pathPaymentStrictReceive",
      label,
      actor: emitter.publicKey(),
      destination: destPublic,
      sendAsset: "XLM:native",
      sendMax,
      destAsset: `USDC:${USDC.issuer}`,
      destAmount,
      errorCode: err.code,
      message: err.message,
      status: "fail",
    });
    return { ok: false, error: err.message };
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  if (!env.SEED_ORIGEN || !env.PUBLIC_ORIGEN || !env.PUBLIC_DESTINO) {
    throw new Error("SEED_ORIGEN, PUBLIC_ORIGEN y PUBLIC_DESTINO son requeridos en .env");
  }

  const emitter = Keypair.fromSecret(env.SEED_ORIGEN);
  const server = serverUrl(env);
  const USDC = new Asset(env.USDC_CODIGO, env.USDC_EMISOR);

  const destPublic = env.PUBLIC_DESTINO;

  console.log("[04] Ejecutando T1: strict send 10 XLM → USDC, destMin=3 (holgado)...");
  await submitPathPaymentStrictSend({
    emitter, server, USDC, destPublic,
    sendAmount: "10", destMin: "3", label: "T1",
  });
  await sleep(3000);

  console.log("\n[04] Ejecutando T2: strict send 10 XLM → USDC, destMin=100 (imposible, debe fallar)...");
  await submitPathPaymentStrictSend({
    emitter, server, USDC, destPublic,
    sendAmount: "10", destMin: "100", label: "T2",
  });
  await sleep(3000);

  console.log("\n[04] Ejecutando T3: strict receive 3 USDC ← XLM, sendMax=10 (holgado)...");
  await submitPathPaymentStrictReceive({
    emitter, server, USDC, destPublic,
    destAmount: "3", sendMax: "10", label: "T3",
  });
  await sleep(3000);

  console.log("\n[04] Ejecutando T4: strict receive 3 USDC ← XLM, sendMax=1 (insuficiente, debe fallar)...");
  await submitPathPaymentStrictReceive({
    emitter, server, USDC, destPublic,
    destAmount: "3", sendMax: "1", label: "T4",
  });

  console.log("\n=== Paso 04 completado ===");
  logger("lab1", "end", { step: "04-path-payment", status: "ok" });
}

main().catch((err) => {
  console.error("[04] ERROR:", err.message);
  logger("lab1", "error", { step: "04-path-payment", errorCode: err.code, message: err.message });
  process.exit(1);
});
