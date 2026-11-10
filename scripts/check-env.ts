import "dotenv/config";
import { Horizon, Keypair } from "@stellar/stellar-sdk";
import { log } from "./lib/logger.js";

async function main() {
  const required = [
    "HORIZON_URL", "SOROBAN_RPC_URL", "SENDER_SECRET", "RECEIVER_SECRET",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Faltan variables:", missing.join(", "));
    process.exit(1);
  }

  const sender = Keypair.fromSecret(process.env.SENDER_SECRET!);
  const receiver = Keypair.fromSecret(process.env.RECEIVER_SECRET!);
  console.log("Sender   :", sender.publicKey());
  console.log("Receiver :", receiver.publicKey());

  // Horizon
  const server = new Horizon.Server(process.env.HORIZON_URL!);
  const root = await server.root();
  console.log("Horizon OK. Core version:", (root as any).core_version);
  log({
    lab: "setup", event: "info", network: "testnet", status: "ok",
    meta: { step: "horizon-reachable", coreVersion: (root as any).core_version },
  });

  // Soroban RPC (health check liviano)
  const rpcRes = await fetch(process.env.SOROBAN_RPC_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
  });
  const rpcJson = await rpcRes.json();
  console.log("Soroban RPC OK:", rpcJson.result?.status);
  log({
    lab: "setup", event: "info", network: "testnet", status: "ok",
    meta: { step: "soroban-reachable", rpcStatus: rpcJson.result?.status },
  });
}

main().catch((e) => {
  console.error(e);
  log({ lab: "setup", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
