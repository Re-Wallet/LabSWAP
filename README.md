# LabSWAP — Laboratorios de Swap en Stellar

Dos laboratorios independientes y autocontenidos:

- **Lab 1 — SDEX / Path Payments** (nivel de protocolo, sin contratos inteligentes).
- **Lab 2 — AMM Soroban** (contratos inteligentes, producto constante x*y=k).
- **Lab 3 — Benchmark comparativo** SDEX vs AMM Soroban (opcional).

> Enfoque agnóstico: la lógica de swap está separada de la plataforma de ejecución.

## Estructura

```
stellar-swap-labs/
├── .env.example              # Plantilla de variables de entorno (NO commitear .env real)
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
├── scripts/
│   └── check-env.ts          # Valida conectividad Horizon + Soroban RPC
├── docs/
│   └── MODELO-MENTAL.md      # x*y=k, impacto de precio, slippage, cuándo usar cada motor
├── labs/
│   ├── lab1-sdex/            # 01..05 scripts + RESULTS.md (T1–T6)
│   ├── lab2-soroban/         # 01..04 scripts + RESULTS.md (T7–T12)
│   └── lab3-benchmark/       # run-matrix.ts + RESULTS.md
└── logs/
    ├── lab1/, lab2/, lab3/   # JSONL por operación (no commitear sensibles)
```

## Fase 0 — Entorno

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar plantilla de entorno y rellenar
cp .env.example .env
# editar .env con tus valores (SEED_ORIGEN, SOROSWAP_API_KEY, TOKEN_A, TOKEN_B, etc.)

# 3. Validar conectividad Testnet
npm run check:env
```

## Ejecutar Lab 1 (SDEX / Path Payments)

```bash
npm run lab1:fund   # 01 fondar cuentas + trustline USDC
npm run lab1:offer  # 02 publicar oferta SDEX (vender 100 XLM por 40 USDC)
npm run lab1:paths  # 03 consultar rutas strict-send / strict-receive
npm run lab1:payment # 04 ejecutar Path Payment (T1–T4)
npm run lab1:verify  # 05 verificar balances antes y después
```

## Ejecutar Lab 2 (Soroswap AMM)

```bash
npm run lab2:init  # 01 inicializar SDK Soroswap
npm run lab2:quote # 02 cotizar EXACT_IN
npm run lab2:swap  # 03 ejecutar swap (T7–T9)
npm run lab2:verify # 04 verificar balances y reservas
```

## Ejecutar Lab 3 (Benchmark)

```bash
npx ts-node labs/lab3-benchmark/run-matrix.ts
```

## Seguridad

- Nunca commitear secretos (`S...`) ni API keys.
- `.env`, `package-lock.json` y `logs/*.jsonl` están en `.gitignore`.
- Verificar antes de commitear: `grep -r "S\." . --include="*.ts" --include="*.md" --include="*.json" | grep -v node_modules` o usar `git secrets`.

## Resultados

Cada lab tiene su `RESULTS.md` con la matriz de casos de prueba (✅/❌) y evidencias de `txHash` en `logs/<lab>/`.

## Referencias

- Stellar Path Payments: https://developers.stellar.org/docs/build/guides/transactions/path-payments
- Soroswap AMM: https://docs.soroswap.finance/amm/how-it-works
- SDK Soroswap: https://www.npmjs.com/package/@soroswap/sdk
- Soroban: https://developers.stellar.org/docs/build/smart-contracts
