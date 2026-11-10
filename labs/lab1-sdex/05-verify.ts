import "dotenv/config";
import { Horizon, Keypair, Asset } from "@stellar/stellar-sdk";
import { log } from "../../scripts/lib/logger.js";

const server = new Horizon.Server(process.env.HORIZON_URL!);
const USDC_CODE = "USDC";

async function balances(pub: string) {
  const acct = await server.loadAccount(pub);
  const out: Record<string, string> = {};
  for (const b of acct.balances as any[]) {
    const code = b.asset_type === "native" ? "XLM" : b.asset_code;
    out[code] = b.balance;
  }
  return out;
}

async function main() {
  const sender = Keypair.fromSecret(process.env.SENDER_SECRET!);
  const receiver = Keypair.fromSecret(process.env.RECEIVER_SECRET!);

  const s = await balances(sender.publicKey());
  const r = await balances(receiver.publicKey());

  console.log("Sender   :", s);
  console.log("Receiver :", r);

  log({
    lab: "lab1", event: "verify", network: "testnet",
    actor: sender.publicKey(), status: "ok",
    meta: { senderBalances: s, receiverBalances: r },
  });
}

main().catch((e) => {
  console.error(e);
  log({ lab: "lab1", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
