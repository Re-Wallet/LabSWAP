// labs/lab1-sdex/02-publish-offer.ts
// Paso 2 del Lab 1: Publicar una oferta de venta en el SDEX (Manage Sell Offer).
//
// Vende 100 XLM a cambio de 40 USDC (precio: 2.5 XLM por USDC).
// Esto establece liquidez inicial en el libro antes del path payment.
//
// Uso:
//   SEED_ORIGEN=... PUBLIC_ORIGEN=... npx ts-node labs/lab1-sdex/02-publish-offer.ts

import { Horizon, Keypair, Networks, Asset, Operation, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { loadEnv, logger } from "./helpers";

async function main(): Promise<void> {
  const env = loadEnv();
  if (!env.SEED_ORIGEN || !env.PUBLIC_ORIGEN) {
    throw new Error("SEED_ORIGEN y PUBLIC_ORIGEN son requeridos en .env");
  }

  const emitter = Keypair.fromSecret(env.SEED_ORIGEN);
  const server = new Horizon.Server(env.HORIZON_URL);
  const USDC = new Asset(env.USDC_CODIGO, env.USDC_EMISOR);

  const account = await server.loadAccount(emitter.publicKey());
  console.log(`[02] Cuenta emisora: ${emitter.publicKey()}`);

  // Balance XLM disponible
  const xlms = account.balances.find((b: any) => b.asset_type === "native");
  console.log(`[02] Balance XLM disponible: ${xlms ? xlms.balance : "0"}`);

  // Publicar oferta de venta: vender 100 XLM por 40 USDC (price = 2.5 XLM/USDC)
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.manageSellOffer({
        selling: Asset.native(),
        buying: USDC,
        amount: "100",
        price: "2.5",
        source: emitter.publicKey(),
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(emitter);
  const result = await server.submitTransaction(tx);
  console.log(`[02] Oferta publicada. txHash: ${result.hash}`);

  logger("lab1", "offer", {
    actor: emitter.publicKey(),
    selling: "XLM:native",
    buying: `${env.USDC_CODIGO}:${env.USDC_EMISOR}`,
    amount: "100",
    price: "2.5",
    priceXLMperUSDC: "2.5",
    priceUSDCperXLM: "0.4",
    txHash: result.hash,
    status: "ok",
  });

  // Verificar que la oferta está activa
  await new Promise((r) => setTimeout(r, 2000));
  const offers = await server
    .offers()
    .forAccount(emitter.publicKey())
    .call();
  console.log(`[02] Ofertas activas del emisor: ${offers.records.length}`);
  for (const o of offers.records) {
    const s = o.selling as any;
    const b = o.buying as any;
    console.log("  offerId=", o.id, "selling=", s.asset_type, s.asset_code || "",
      "buying=", b.asset_type, b.asset_code || "",
      "amount=", o.amount, "price=", o.price);
  }

  console.log("\n=== Paso 02 completado ===");
  logger("lab1", "end", { step: "02-publish-offer", status: "ok" });
}

main().catch((err) => {
  console.error("[02] ERROR:", err.message);
  logger("lab1", "error", { step: "02-publish-offer", errorCode: err.code, message: err.message });
  process.exit(1);
});
