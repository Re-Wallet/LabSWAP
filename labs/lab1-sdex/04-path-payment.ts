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

async function main() {
  console.log("--- Caso T1: Strict Send exitoso ---");
  await strictSend();
  await new Promise((r) => setTimeout(r, 3000));
  console.log("\n--- Caso T2: Strict Send con destMin imposible ---");
  await strictSendFail();
}

main().catch((e) => {
  console.error(e);
  log({ lab: "lab1", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
