import "dotenv/config";
import {
  Horizon, Keypair, Asset, TransactionBuilder, Operation, Networks, BASE_FEE,
} from "@stellar/stellar-sdk";
import { log } from "../../scripts/lib/logger.js";

const server = new Horizon.Server(process.env.HORIZON_URL!);
const USDC = new Asset("USDC", process.env.USDC_ISSUER!);

async function strictSend() {
  const sender = Keypair.fromSecret(process.env.SENDER_SECRET!);
  const receiver = Keypair.fromSecret(process.env.RECEIVER_SECRET!);
  const acct = await server.loadAccount(sender.publicKey());

  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount: "10",
        destination: receiver.publicKey(),
        destAsset: USDC,
        destMin: "3",
        path: [],
      }),
    )
    .setTimeout(30)
    .build();
  tx.sign(sender);
  const res = await server.submitTransaction(tx);
  console.log("Strict Send OK. Hash:", res.hash);
  log({
    lab: "lab1", event: "submit", network: "testnet",
    actor: sender.publicKey(), assetIn: "XLM", assetOut: "USDC",
    amountIn: "10", txHash: res.hash, status: "ok",
    meta: { mode: "strict-send", destMin: "3" },
  });
}

async function strictSendFail() {
  const sender = Keypair.fromSecret(process.env.SENDER_SECRET!);
  const receiver = Keypair.fromSecret(process.env.RECEIVER_SECRET!);
  const acct = await server.loadAccount(sender.publicKey());
  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount: "10",
        destination: receiver.publicKey(),
        destAsset: USDC,
        destMin: "9999",
        path: [],
      }),
    )
    .setTimeout(30)
    .build();
  tx.sign(sender);
  try {
    await server.submitTransaction(tx);
    console.log("⚠️ No debería haber pasado");
    log({
      lab: "lab1", event: "submit", network: "testnet",
      actor: sender.publicKey(), status: "fail",
      errorCode: "expected-failure-but-succeeded",
      meta: { mode: "strict-send-fail-case", destMin: "9999" },
    });
  } catch (e: any) {
    const codes = e?.response?.data?.extras?.result_codes ?? e?.message;
    console.log("Fallo esperado (slippage):", codes);
    log({
      lab: "lab1", event: "submit", network: "testnet",
      actor: sender.publicKey(), status: "ok",
      errorCode: JSON.stringify(codes),
      meta: { mode: "strict-send-fail-case", expected: "revert" },
    });
  }
}

async function strictReceive() {
  const sender = Keypair.fromSecret(process.env.SENDER_SECRET!);
  const receiver = Keypair.fromSecret(process.env.RECEIVER_SECRET!);
  const acct = await server.loadAccount(sender.publicKey());

  // Recibir 3 USDC, enviar máximo 10 XLM (sendMax holgado)
  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: "10",
        destination: receiver.publicKey(),
        destAsset: USDC,
        destAmount: "3",
        path: [],
      }),
    )
    .setTimeout(30)
    .build();
  tx.sign(sender);
  const res = await server.submitTransaction(tx);
  console.log("Strict Receive OK. Hash:", res.hash);
  log({
    lab: "lab1", event: "submit", network: "testnet",
    actor: sender.publicKey(), assetIn: "XLM", assetOut: "USDC",
    amountOut: "3", txHash: res.hash, status: "ok",
    meta: { mode: "strict-receive", sendMax: "10" },
  });
}

async function strictReceiveFail() {
  const sender = Keypair.fromSecret(process.env.SENDER_SECRET!);
  const receiver = Keypair.fromSecret(process.env.RECEIVER_SECRET!);
  const acct = await server.loadAccount(sender.publicKey());
  // Recibir 3 USDC pero enviar máximo 1 XLM (sendMax insuficiente)
  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: "1",
        destination: receiver.publicKey(),
        destAsset: USDC,
        destAmount: "3",
        path: [],
      }),
    )
    .setTimeout(30)
    .build();
  tx.sign(sender);
  try {
    await server.submitTransaction(tx);
    console.log("⚠️ No debería haber pasado");
    log({
      lab: "lab1", event: "submit", network: "testnet",
      actor: sender.publicKey(), status: "fail",
      errorCode: "expected-failure-but-succeeded",
      meta: { mode: "strict-receive-fail-case", sendMax: "1", destAmount: "3" },
    });
  } catch (e: any) {
    const codes = e?.response?.data?.extras?.result_codes ?? e?.message;
    console.log("Fallo esperado (slippage):", codes);
    log({
      lab: "lab1", event: "submit", network: "testnet",
      actor: sender.publicKey(), status: "ok",
      errorCode: JSON.stringify(codes),
      meta: { mode: "strict-receive-fail-case", expected: "revert" },
    });
  }
}

async function noLiquidityRoute() {
  // T5: Consultar ruta con monto muy grande que no tenga liquidez
  try {
    const paths = await server
      .strictSendPaths(Asset.native(), "10000000", [USDC])
      .call();
    console.log("Rutas para 10,000,000 XLM:", paths.records.length);
    log({
      lab: "lab1", event: "quote", network: "testnet",
      assetIn: "XLM", assetOut: "USDC", amountIn: "10000000",
      status: paths.records.length > 0 ? "ok" : "fail",
      meta: { mode: "strict-send-big", pathsFound: paths.records.length },
    });
  } catch (e: any) {
    console.log("Error consultando ruta sin liquidez:", e?.message);
    log({
      lab: "lab1", event: "error", network: "testnet",
      assetIn: "XLM", assetOut: "USDC", amountIn: "10000000",
      status: "fail",
      errorCode: String(e?.code ?? e?.message),
      meta: { mode: "strict-send-big", expected: "empty-or-error" },
    });
  }
}

async function missingTrustline() {
  // T6: Intentar enviar USDC a una cuenta SIN trustline → op_no_trust
  const sender = Keypair.fromSecret(process.env.SENDER_SECRET!);
  const noTrustline = Keypair.random(); // cuenta sin trustline USDC
  const acct = await server.loadAccount(sender.publicKey());

  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount: "5",
        destination: noTrustline.publicKey(),
        destAsset: USDC,
        destMin: "1",
        path: [],
      }),
    )
    .setTimeout(30)
    .build();
  tx.sign(sender);
  try {
    await server.submitTransaction(tx);
    console.log("⚠️ No debería haber pasado (destino sin trustline)");
    log({
      lab: "lab1", event: "submit", network: "testnet",
      actor: sender.publicKey(), status: "fail",
      errorCode: "expected-failure-but-succeeded",
      meta: { mode: "missing-trustline", dest: noTrustline.publicKey() },
    });
  } catch (e: any) {
    const codes = e?.response?.data?.extras?.result_codes ?? e?.message;
    console.log("Fallo esperado (no trustline):", codes);
    log({
      lab: "lab1", event: "submit", network: "testnet",
      actor: sender.publicKey(), status: "ok",
      errorCode: JSON.stringify(codes),
      meta: { mode: "missing-trustline", expected: "op_no_trust" },
    });
  }
}

async function main() {
  console.log("--- Caso T1: Strict Send exitoso ---");
  await strictSend();
  await new Promise((r) => setTimeout(r, 3000));

  console.log("\n--- Caso T2: Strict Send con destMin imposible ---");
  await strictSendFail();
  await new Promise((r) => setTimeout(r, 3000));

  console.log("\n--- Caso T3: Strict Receive exitoso ---");
  await strictReceive();
  await new Promise((r) => setTimeout(r, 3000));

  console.log("\n--- Caso T4: Strict Receive con sendMax insuficiente ---");
  await strictReceiveFail();
  await new Promise((r) => setTimeout(r, 3000));

  console.log("\n--- Caso T5: Consulta de rutas sin liquidez suficiente ---");
  await noLiquidityRoute();
  await new Promise((r) => setTimeout(r, 3000));

  console.log("\n--- Caso T6: Trustline faltante en destino ---");
  await missingTrustline();
}

main().catch((e) => {
  console.error(e);
  log({ lab: "lab1", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
