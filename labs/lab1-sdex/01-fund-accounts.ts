import "dotenv/config";
import { Horizon, Keypair, Asset } from "@stellar/stellar-sdk";
import { log } from "../../scripts/lib/logger.js";

const server = new Horizon.Server(process.env.HORIZON_URL!);
const USDC = new Asset("USDC", process.env.USDC_ISSUER!);

async function fundWithFriendbot(pub: string) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${pub}`);
  if (!res.ok) throw new Error(`Friendbot falló para ${pub}`);
  return res.json();
}

async function ensureAccount(kp: Keypair) {
  try {
    await server.loadAccount(kp.publicKey());
    console.log(`Cuenta existente: ${kp.publicKey()}`);
  } catch {
    console.log(`Fondeando con Friendbot: ${kp.publicKey()}`);
    await fundWithFriendbot(kp.publicKey());
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function ensureTrustline(kp: Keypair, asset: Asset) {
  const acct = await server.loadAccount(kp.publicKey());
  const has = acct.balances.some(
    (b: any) =>
      b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer(),
  );
  if (has) {
    console.log("Trustline ya existe");
    return;
  }
  const { TransactionBuilder, Operation, Networks, BASE_FEE } =
    await import("@stellar/stellar-sdk");
  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset, limit: "1000000" }))
    .setTimeout(30)
    .build();
  tx.sign(kp);
  await server.submitTransaction(tx);
  console.log("Trustline USDC creada");
  log({
    lab: "lab1", event: "submit", network: "testnet",
    actor: kp.publicKey(), status: "ok",
    meta: { step: "trustline-created", asset: "USDC" },
  });
}

async function main() {
  const sender = Keypair.fromSecret(process.env.SENDER_SECRET!);
  const receiver = Keypair.fromSecret(process.env.RECEIVER_SECRET!);

  await ensureAccount(sender);
  await ensureAccount(receiver);
  await ensureTrustline(sender, USDC);
  await ensureTrustline(receiver, USDC);

  console.log("\nListo. Ambas cuentas fondeadas y con trustline USDC.");
}

main().catch((e) => {
  console.error(e);
  log({ lab: "lab1", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
