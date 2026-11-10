import "dotenv/config";
import {
  Horizon, Keypair, Asset, TransactionBuilder, Operation, Networks, BASE_FEE,
} from "@stellar/stellar-sdk";
import { log } from "../../scripts/lib/logger.js";

const server = new Horizon.Server(process.env.HORIZON_URL!);
const USDC = new Asset("USDC", process.env.USDC_ISSUER!);

async function main() {
  const sender = Keypair.fromSecret(process.env.SENDER_SECRET!);
  const acct = await server.loadAccount(sender.publicKey());

  // Vende 50 XLM pidiendo 25 USDC → 0.5 USDC por XLM.
  const SELL_AMOUNT = "50";
  const PRICE_USDC_PER_XLM = "0.5";

  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.manageSellOffer({
        selling: Asset.native(),
        buying: USDC,
        amount: SELL_AMOUNT,
        price: PRICE_USDC_PER_XLM,
        offerId: "0",
      }),
    )
    .setTimeout(30)
    .build();

  tx.sign(sender);
  const res = await server.submitTransaction(tx);
  console.log("Oferta publicada. Hash:", res.hash);

  log({
    lab: "lab1", event: "submit", network: "testnet",
    actor: sender.publicKey(),
    assetIn: "XLM", assetOut: "USDC",
    amountIn: SELL_AMOUNT, priceMarginal: PRICE_USDC_PER_XLM,
    txHash: res.hash, status: "ok",
    meta: { step: "publish-sell-offer" },
  });
}

main().catch((e) => {
  console.error(e);
  log({ lab: "lab1", event: "error", network: "testnet", status: "fail",
    errorCode: String(e?.message ?? e) });
  process.exit(1);
});
