// labs/lab1-sdex/05-verify.ts
// Paso 5 del Lab 1: Verificar balances antes y después de las operaciones.
// Muestra balances XLM y USDC de origen y destino.
//
// Uso:
//   PUBLIC_ORIGEN=... PUBLIC_DESTINO=... npx ts-node labs/lab1-sdex/05-verify.ts

import { Horizon, Asset } from "@stellar/stellar-sdk";
import { loadEnv, logger } from "./helpers";

async function printBalances(server: Horizon.Server, publicKey: string, label: string): Promise<any> {
  const account = await server.loadAccount(publicKey);
  console.log(`\n[05] Balances ${label} (${publicKey}):`);
  for (const b of account.balances) {
    const bi = b as any;
    const code = bi.asset_code || "(native)";
    const type = bi.asset_type;
    console.log(`  ${type} ${code}: ${bi.balance} (límite: ${bi.limit || "n/a"})`);
  }
  logger("lab1", "verify", {
    label,
    actor: publicKey,
    balances: account.balances.map((b: any) => ({
      asset_type: b.asset_type,
      asset_code: b.asset_code,
      balance: b.balance,
      limit: b.limit,
    })),
    status: "ok",
  });
  return account;
}

async function main(): Promise<void> {
  const env = loadEnv();
  const server = new Horizon.Server(env.HORIZON_URL);
  const USDC = new Asset(env.USDC_CODIGO, env.USDC_EMISOR);

  const origenPub = env.PUBLIC_ORIGEN;
  const destinoPub = env.PUBLIC_DESTINO;

  if (origenPub) await printBalances(server, origenPub, "ORIGEN");
  if (destinoPub) await printBalances(server, destinoPub, "DESTINO");

  const usdcDest = destinoPub
    ? (await server.loadAccount(destinoPub)).balances.find((b: any) => b.asset_code === env.USDC_CODIGO)
    : null;
  if (usdcDest) {
    console.log(`\n[05] Balance USDC destino final: ${usdcDest.balance}`);
  }

  console.log("\n=== Paso 05 completado ===");
  logger("lab1", "end", { step: "05-verify", status: "ok" });
}

main().catch((err) => {
  console.error("[05] ERROR:", err.message);
  logger("lab1", "error", { step: "05-verify", errorCode: err.code, message: err.message });
  process.exit(1);
});
