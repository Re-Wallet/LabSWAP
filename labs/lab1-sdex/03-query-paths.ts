// labs/lab1-sdex/03-query-paths.ts
// Paso 3 del Lab 1: Consultar rutas de conversión en Horizon.
//   - GET /paths/strict-send  (source_asset, source_amount, destination_asset)
//   - GET /paths/strict-receive (source_asset, destination_asset, destination_amount)
//
// Se usa fetch directo a Horizon para evitar depender de la firma exacta
// de server.paths() del SDK (que varía entre versiones).
//
// Uso:
//   PUBLIC_ORIGEN=... npx ts-node labs/lab1-sdex/03-query-paths.ts

import { Asset } from "@stellar/stellar-sdk";
import { loadEnv, logger } from "./helpers";

function assetQueryParams(asset: Asset): Record<string, string> {
  if (asset.isNative()) {
    return { asset_type: "native" };
  }
  return {
    asset_type: "credit_alphanum4",
    asset_code: asset.getCode(),
    asset_issuer: asset.getIssuer(),
  };
}

async function fetchPaths(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  return res.json();
}

async function main(): Promise<void> {
  const env = loadEnv();
  const HORIZON = env.HORIZON_URL;
  const USDC = new Asset(env.USDC_CODIGO, env.USDC_EMISOR);

  const sourceAmount = "10"; // 10 XLM
  const destAmount = "3"; // 3 USDC

  const srcParams = assetQueryParams(Asset.native());
  const dstParams = assetQueryParams(USDC);

  const qsStrictSend = new URLSearchParams({
    ...srcParams,
    source_amount: sourceAmount,
    ...dstParams,
  } as Record<string, string>).toString();

  const qsStrictReceive = new URLSearchParams({
    ...srcParams,
    ...dstParams,
    destination_amount: destAmount,
  } as Record<string, string>).toString();

  console.log("[03] Consultando rutas strict-send (enviar 10 XLM → recibir USDC)...");
  try {
    const data = await fetchPaths(`${HORIZON}/paths/strict-send?${qsStrictSend}`);
    const records: any[] = data.records || [];
    console.log(`[03] strict-send rutas encontradas: ${records.length}`);
    for (const route of records) {
      console.log("  ruta:", JSON.stringify(route.path, null, 2));
      console.log("  source_amount:", route.source_amount, "destination_amount:", route.destination_amount);
      logger("lab1", "route", {
        type: "strict-send",
        sourceAsset: "XLM:native",
        sourceAmount,
        destinationAsset: `${env.USDC_CODIGO}:${env.USDC_EMISOR}`,
        path: route.path,
        priceEffective: route.destination_amount,
        status: "ok",
      });
    }
  } catch (err: any) {
    console.error("[03] strict-send error:", err.message);
    logger("lab1", "error", {
      type: "strict-send",
      errorCode: err.code,
      message: err.message,
      status: "fail",
    });
  }

  console.log("\n[03] Consultando rutas strict-receive (recibir 3 USDC → enviar XLM)...");
  try {
    const data = await fetchPaths(`${HORIZON}/paths/strict-receive?${qsStrictReceive}`);
    const records: any[] = data.records || [];
    console.log(`[03] strict-receive rutas encontradas: ${records.length}`);
    for (const route of records) {
      console.log("  ruta:", JSON.stringify(route.path, null, 2));
      console.log("  source_amount:", route.source_amount, "destination_amount:", route.destination_amount);
      logger("lab1", "route", {
        type: "strict-receive",
        sourceAsset: "XLM:native",
        destinationAsset: `${env.USDC_CODIGO}:${env.USDC_EMISOR}`,
        destinationAmount: destAmount,
        path: route.path,
        priceEffective: route.source_amount,
        status: "ok",
      });
    }
  } catch (err: any) {
    console.error("[03] strict-receive error:", err.message);
    logger("lab1", "error", {
      type: "strict-receive",
      errorCode: err.code,
      message: err.message,
      status: "fail",
    });
  }

  // Caso T5: consulta sin liquidez suficiente → monto grande
  console.log("\n[03] (T5) Consulta strict-send con monto grande (10000 XLM) para probar ruta vacía...");
  const qsBig = new URLSearchParams({
    ...srcParams,
    source_amount: "10000",
    ...dstParams,
  } as Record<string, string>).toString();
  try {
    const data = await fetchPaths(`${HORIZON}/paths/strict-send?${qsBig}`);
    const records: any[] = data.records || [];
    console.log(`[03] strict-send 10000 XLM rutas: ${records.length}`);
    logger("lab1", "route", {
      type: "strict-send-big",
      sourceAmount: "10000",
      rutaCount: records.length,
      status: records.length === 0 ? "empty" : "ok",
    });
  } catch (err: any) {
    console.error("[03] strict-send big error:", err.message);
    logger("lab1", "error", { type: "strict-send-big", errorCode: err.code, message: err.message, status: "fail" });
  }

  console.log("\n=== Paso 03 completado ===");
  logger("lab1", "end", { step: "03-query-paths", status: "ok" });
}

main().catch((err) => {
  console.error("[03] ERROR:", err.message);
  logger("lab1", "error", { step: "03-query-paths", errorCode: err.code, message: err.message });
  process.exit(1);
});
