# Guía de Despliegue — LabSWAP

## 1. Prerrequisitos

- Node.js 20+
- Rust con target `wasm32v1-none`
- Stellar CLI 30.0.1+
- Cuenta en Stellar Testnet (fondada con Friendbot)

## 2. Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd LabSWAP

# Instalar dependencias Node.js
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con valores reales
```

## 3. Validar Entorno

```bash
npm run check-env
```

## 4. Desplegar Contratos Soroban (Opcional — ya desplegados)

```bash
# Compilar contratos
cd contracts/amm-simple && stellar contract build && cd ../..
cd contracts/simple-token && stellar contract build && cd ../..

# Desplegar AMM
stellar contract deploy \
  --wasm contracts/amm-simple/target/wasm32v1-none/release/amm_simple.wasm \
  --source labzk-soroban-testnet \
  --network testnet \
  --network-passphrase "Test SDF Network ; September 2015"

# Desplegar Tokens (dos veces, una para cada token)
stellar contract deploy \
  --wasm contracts/simple-token/target/wasm32v1-none/release/simple_token.wasm \
  --source labzk-soroban-testnet \
  --network testnet \
  --network-passphrase "Test SDF Network ; September 2015"
```

## 5. Inicializar Contratos

```bash
# Inicializar AMM
stellar contract invoke --id <AMM_ID> --source <CUENTA> --network testnet \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- initialize \
  --token_a <TOKEN_A_ID> --token_b <TOKEN_B_ID> \
  --amount_a 50000000 --amount_b 50000000

# Inicializar Token A y Token B
stellar contract invoke --id <TOKEN_ID> --source <CUENTA> --network testnet \
  -- initialize --admin <ADMIN> --decimals 7 --name TokenA --symbol TKA
```

## 6. Ejecutar Laboratorios

```bash
# Fase 0 — Entorno
npm run check-env

# Lab 1 — SDEX
npm run lab1:fund
npm run lab1:offer
npm run lab1:paths
npm run lab1:swap
npm run lab1:verify

# Lab 2 — Soroban AMM
npm run lab2:quote
npm run lab2:swap
npm run lab2:verify

# Lab 3 — Benchmark
npx tsx labs/lab3-benchmark/run-matrix.ts
```

## 7. Estructura del Repositorio

```
stellar-swap-labs/
├── .env.example              # Plantilla de variables (no commitear .env)
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
├── scripts/
│   ├── check-env.ts          # Validar conectividad
│   └── lib/logger.ts         # Logger JSONL centralizado
├── docs/
│   ├── ARCHITECTURE.md       # Diagrama de arquitectura
│   ├── SUCCESS_CASES.md      # Casos de éxito con txHash
│   ├── API_REFERENCE.md      # Referencia de contratos
│   ├── DEPLOYMENT.md         # Guía de despliegue
│   └── MODELO-MENTAL.md      # x*y=k, impacto, slippage
├── contracts/
│   ├── amm-simple/           # Contrato AMM (código fuente)
│   └── simple-token/         # Contrato Token (código fuente)
├── labs/
│   ├── lab1-sdex/            # Scripts 01-05 + RESULTS.md
│   ├── lab2-soroban/         # Scripts 02-04 + RESULTS.md
│   └── lab3-benchmark/       # run-matrix.ts + RESULTS.md
└── logs/                     # JSONL por operación (no commitear)
```

## 8. Seguridad

- ✅ `.env` en `.gitignore`
- ✅ `logs/` en `.gitignore`
- ✅ `contracts/*/target/` en `.gitignore` (build artifacts)
- ✅ Verificar antes de commitear: `grep -r "S[A-Z][A-Z0-9]{40,}" --exclude-dir=node_modules .`
