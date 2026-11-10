// labs/lab2-soroban/01-init-sdk.ts
// Paso 1 del Lab 2: Inicializar el SDK de Soroswap y validar conectividad.
//
// Requiere en .env:
//   SOROSWAP_API_KEY=sk_test_...  (obtener en https://api.soroswap.finance)
//   SOROSWAP_RED=TESTNET
//
// Uso:
//   SOROSWAP_API_KEY=... npx ts-node labs/lab2-soroban/01-init-sdk.ts

import {
  SoroswapSDK,
  SupportedNetworks,
} from "@soroswap/sdk";
import { loadEnvLab2, logger } from "./helpers";

async function main(): Promise<void> {
  const env = loadEnvLab2();
  logger("lab2", "start", { step: "01-init-sdk" });

  if (!env.SOROSWAP_API_KEY) {
    console.warn(
      "[01] ADVERTENCIA: SOROSWAP_API_KEY no definido. Obtén una en https://api.soroswap.finance y agrégala a .env"
    );
    logger("lab2", "warn", {
      step: "01-init-sdk",
      message: "SOROSWAP_API_KEY no configurado",
    });
  }

  const client = new SoroswapSDK({
    apiKey: env.SOROSWAP_API_KEY || "",
    defaultNetwork: SupportedNetworks.TESTNET,
  });

  console.log("[01] SDK Soroswap inicializado (red TESTNET).");
  logger("lab2", "init", {
    sdk: "@soroswap/sdk",
    network: "TESTNET",
    hasApiKey: Boolean(env.SOROSWAP_API_KEY),
    status: env.SOROSWAP_API_KEY ? "ok" : "sin_api_key",
  });

  // Intento ligero de listar activos soportados (si el SDK lo expone)
  try {
    // Algunos builds exponen un método de assets; lo intentamos de forma defensiva
    const listAssets: any = (client as any).listAssets ?? (client as any).assets;
    if (typeof listAssets === "function") {
      const assets = await listAssets();
      console.log(`[01] Activos soportados: ${Array.isArray(assets) ? assets.length : "n/a"}`);
      logger("lab2", "assets", { count: Array.isArray(assets) ? assets.length : 0, status: "ok" });
    } else {
      console.log("[01] SDK listo (método de listado de activos no expuesto en esta versión).");
      logger("lab2", "assets", { status: "not_exposed" });
    }
  } catch (err: any) {
    console.warn(`[01] No se pudo listar activos: ${err.message}`);
    logger("lab2", "warn", { step: "01-init-sdk", message: err.message });
  }

  console.log("\n=== Paso 01 completado ===");
  logger("lab2", "end", { step: "01-init-sdk", status: "ok" });
}

main().catch((err) => {
  console.error("[01] ERROR:", err.message);
  logger("lab2", "error", { step: "01-init-sdk", errorCode: err.code, message: err.message });
  process.exit(1);
});
