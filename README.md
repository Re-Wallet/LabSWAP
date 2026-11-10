# LabSWAP — Laboratorios de Swap en Stellar

Dos laboratorios independientes y autocontenidos:

- **Lab 1 — SDEX / Path Payments** (nivel de protocolo, sin contratos inteligentes).
- **Lab 2 — AMM Soroban** (contratos inteligentes, producto constante x*y=k).
- **Lab 3 — Benchmark comparativo** SDEX vs AMM Soroban (opcional).

> Enfoque agnóstico: la lógica de swap está separada de la plataforma de ejecución.

## Estructura

```
stellar-swap-labs/
├── .env.example              # Variables de entorno (NO commitear .env real)
├── package.json
├── tsconfig.json
├── scripts/
│   └── check-env.ts          # Valida conectividad Horizon + Soroban RPC
├── labs/
│   ├── lab1-sdex/            # 01..05 scripts + RESULTS.md
│   ├── lab2-soroban/         # 01..04 scripts + RESULTS.md
│   └── lab3-benchmark/       # run-matrix.ts + RESULTS.md
├── logs/
│   ├── lab1/, lab2/, lab3/   # JSONL por operación (no commitear sensibles)
└── docs/
    └── MODELO-MENTAL.md
```

## Fase 0 — Entorno

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno y rellenar
cp .env.example .env
# editar .env con tus claves (SENDER_SECRET, etc.)

# 3. Validar conectividad
npm run check:env
```

## Ejecutar Lab 1 (SDEX)

```bash
npm run lab1:fund   # 01 fondar cuentas y trustlines
npm run lab1:offer  # 02 publicar oferta SDEX
npm run lab1:paths  # 03 consultar rutas strict-send/strict-receive
npm run lab1:payment # 04 ejecutar Path Payment (ambos modos)
npm run lab1:verify # 05 verificar balances + slippage
```

## Ejecutar Lab 2 (Soroswap AMM)

```bash
npm run lab2:init  # 01 inicializar SDK
npm run lab2:quote # 02 cotizar
npm run lab2:swap  # 03 ejecutar swap EXACT_IN
npm run lab2:verify # 04 verificar balances y reservas
```

## Seguridad

- Nunca commitear secretos (`S...`) ni API keys.
- Los archivos `.env` y `logs/*.jsonl` están en `.gitignore`.

## Referencias

- Stellar Path Payments: https://developers.stellar.org/docs/build/guides/transactions/path-payments
- Soroswap AMM: https://docs.soroswap.finance/amm/how-it-works
- Soroban: https://developers.stellar.org/docs/build/smart-contracts
