// labs/lab1-sdex/01-fund-accounts.ts
// Paso 1 del Lab 1: Fondar cuentas (Friendbot) y establecer trustline USDC en el receptor.
//
// Uso:
//   SEED_ORIGEN=... PUBLIC_ORIGEN=... SEED_DESTINO=... PUBLIC_DESTINO=... npx ts-node labs/lab1-sdex/01-fund-accounts.ts
//
// Si no se proveen SEEDs, se generan keypairs aleatorios y se instruye al usuario
// para fundarlos con Friendbot manualmente.

import { Horizon, Keypair, Networks, Asset, Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { loadEnv, logger } from "./helpers";

async function fundWithFriendbot(publicKey: string): Promise<void> {
  const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Friendbot falló para ${publicKey}: HTTP ${res.status} ${text}`);
  }
  const data = await res.json();
  return data;
}

async function main(): Promise<void> {
  const env = loadEnv();
  logger("lab1", "start", { step: "01-fund-accounts", actor: env.PUBLIC_ORIGEN });

  // --- Origen ---
  let origen: Keypair;
  if (env.SEED_ORIGEN) {
    origen = Keypair.fromSecret(env.SEED_ORIGEN);
    logger("lab1", "account", {
      role: "origen",
      publicKey: origen.publicKey(),
      source: "env",
    });
  } else {
    origen = Keypair.random();
    console.log("SEED_ORIGEN no definido. Keypair origen generado:");
    console.log("  PUBLIC_ORIGEN=", origen.publicKey());
    console.log("  SEED_ORIGEN=", origen.secret());
    console.log("Fondea esta cuenta en: https://friendbot.stellar.org?addr=" + origen.publicKey());
  }

  // --- Destino ---
  let destino: Keypair;
  if (env.SEED_DESTINO) {
    destino = Keypair.fromSecret(env.SEED_DESTINO);
    logger("lab1", "account", {
      role: "destino",
      publicKey: destino.publicKey(),
      source: "env",
    });
  } else {
    destino = Keypair.random();
    console.log("SEED_DESTINO no definido. Keypair destino generado:");
    console.log("  PUBLIC_DESTINO=", destino.publicKey());
    console.log("  SEED_DESTINO=", destino.secret());
    console.log("Fondea esta cuenta en: https://friendbot.stellar.org?addr=" + destino.publicKey());
  }

  const server = new Horizon.Server(env.HORIZON_URL);
  const USDC = new Asset(env.USDC_CODIGO, env.USDC_EMISOR);

  // Fondar origen si existe en env
  if (env.SEED_ORIGEN && env.PUBLIC_ORIGEN) {
    console.log(`[01] Fondando origen ${origen.publicKey()}...`);
    await fundWithFriendbot(origen.publicKey());
    logger("lab1", "friendbot", { role: "origen", publicKey: origen.publicKey(), status: "ok" });
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (env.SEED_DESTINO && env.PUBLIC_DESTINO) {
    console.log(`[01] Fondando destino ${destino.publicKey()}...`);
    await fundWithFriendbot(destino.publicKey());
    logger("lab1", "friendbot", { role: "destino", publicKey: destino.publicKey(), status: "ok" });
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Cargar cuenta destino para establecer trustline USDC
  if (env.SEED_DESTINO && env.PUBLIC_DESTINO) {
    const destAccount = await server.loadAccount(destino.publicKey());
    console.log(`[01] Balance destino antes del trustline:`);
    for (const b of destAccount.balances) {
      const bi = b as any;
      console.log("  ", bi.asset_type, bi.asset_code || "(native)", bi.balance);
    }

    const tx = new TransactionBuilder(destAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.changeTrust({
          asset: USDC,
          limit: "1000",
          source: destino.publicKey(),
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(destino);
    const result = await server.submitTransaction(tx);
    console.log(`[01] Trustline USDC creada. txHash: ${result.hash}`);
    logger("lab1", "trustline", {
      actor: destino.publicKey(),
      asset: `${env.USDC_CODIGO}:${env.USDC_EMISOR}`,
      limit: "1000",
      txHash: result.hash,
      status: "ok",
    });

    const after = await server.loadAccount(destino.publicKey());
    const usdcBal = after.balances.find((b: any) => b.asset_code === env.USDC_CODIGO);
    console.log(`[01] Balance USDC destino después del trustline:`, usdcBal ? usdcBal.balance : "(aún sin balance)");
  } else {
    console.log("[01] Saltando trustline: SEED_DESTINO no definido. Créala manualmente con:");
    console.log(`   changeTrust(asset=${env.USDC_CODIGO}:${env.USDC_EMISOR}, limit=1000) en ${destino.publicKey()}`);
  }

  console.log("\n=== Paso 01 completado ===");
  logger("lab1", "end", { step: "01-fund-accounts", status: "ok" });
}

main().catch((err) => {
  console.error("[01] ERROR:", err.message);
  logger("lab1", "error", { step: "01-fund-accounts", errorCode: err.code, message: err.message });
  process.exit(1);
});
