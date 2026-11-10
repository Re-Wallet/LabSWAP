# LabSWAP — Laboratorios de Swap en Stellar

Dos laboratorios independientes y autocontenidos:

- **Lab 1 — SDEX / Path Payments** (nivel de protocolo, sin contratos inteligentes).
- **Lab 2 — AMM Soroban** (contratos inteligentes, producto constante x*y=k).
- **Lab 3 — Benchmark comparativo** SDEX vs AMM Soroban (opcional).

> Enfoque agnóstico: la lógica de swap está separada de la plataforma de ejecución.

## Estructura

```
stellar-swap-labs/
├── .env.example              # plantilla de variables (NO commitear .env real)
├── .gitignore
├── package.json              # type: module, tsx, dotenv
├── tsconfig.json
├── README.md
├── scripts/
│   ├── check-env.ts          # valida conectividad Horizon + Soroban RPC
│   └── lib/logger.ts         # logger JSONL centralizado
├── docs/
│   └── MODELO-MENTAL.md      # x*y=k, impacto, slippage, economía del pool
├── labs/
│   ├── lab1-sdex/            # 01-fund, 02-offer, 03-paths, 04-payment, 05-verify + RESULTS.md (T1–T6)
│   ├── lab2-soroban/         # 02-quote, 03-swap, 04-verify + RESULTS.md (T7–T12)
│   └── lab3-benchmark/       # run-matrix.ts + RESULTS.md
└── logs/
    ├── lab1/, lab2/, lab3/   # JSONL por operación (no commitear sensibles)
```

## Fase 0 — Entorno

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar plantilla y rellenar
cp .env.example .env
# editar .env (SENDER_SECRET, RECEIVER_SECRET, SOROSWAP_API_KEY, TOKEN_A, TOKEN_B, etc.)

# 3. Validar conectividad Testnet
npm run check-env
```

## Ejecutar Lab 1 (SDEX / Path Payments)

```bash
npm run lab1:fund   # 01 fondar cuentas + trustline USDC
npm run lab1:offer  # 02 publicar oferta SDEX (vender 50 XLM por 25 USDC)
npm run lab1:paths  # 03 consultar rutas strict-send / strict-receive
npm run lab1:swap   # 04 ejecutar Path Payment (T1: éxito, T2: slippage falla)
npm run lab1:verify # 05 verificar balances antes y después
```

## Ejecutar Lab 2 (Soroswap AMM)

```bash
npm run lab2:quote  # 02 cotizar EXACT_IN
npm run lab2:swap   # 03 ejecutar swap (T7 pequeño, T8 grande, T9 slippage)
npm run lab2:verify # 04 verificar balances y reservas on-chain
```

## Ejecutar Lab 3 (Benchmark)

```bash
npx tsx labs/lab3-benchmark/run-matrix.ts
```

## Seguridad

- Nunca commitear secretos (`S...`) ni API keys.
- `.env`, `package-lock.json` y `logs/*.jsonl` están en `.gitignore`.

## Resultados

Cada lab tiene su `RESULTS.md` con la matriz de casos (✅/❌) y evidencias de `txHash` en `logs/<lab>/`.

## Referencias

- Stellar Path Payments: https://developers.stellar.org/docs/build/guides/transactions/path-payments
- Soroswap AMM: https://docs.soroswap.finance/amm/how-it-works
- SDK Soroswap: https://www.npmjs.com/package/@soroswap/sdk
- Soroban: https://developers.stellar.org/docs/build/smart-contracts
