# LabSWAP — Laboratorios de Swap en Stellar

> Dos laboratorios independientes y autocontenidos para comprender y ejecutar swaps en Stellar:
> **Lab 1 — SDEX / Path Payments** (nivel de protocolo) y **Lab 2 — AMM Soroban** (contratos inteligentes, x*y=k).
> Incluye **Lab 3 — Benchmark comparativo** entre ambos motores.

> 🎯 **Enfoque agnóstico:** La lógica de swap está separada de la plataforma de ejecución.

---

## 📋 Tabla de Contenidos

- [Estructura del Repositorio](#estructura)
- [Fase 0 — Entorno](#fase-0)
- [Lab 1 — SDEX / Path Payments](#lab-1)
- [Lab 2 — AMM Soroban](#lab-2)
- [Lab 3 — Benchmark Comparativo](#lab-3)
- [Contratos Desplegados](#contratos)
- [Casos de Éxito](#casos-exito)
- [Documentación Adicional](#documentacion)
- [Seguridad](#seguridad)
- [Referencias](#referencias)

---

<a name="estructura"></a>
## 📁 Estructura del Repositorio

```
stellar-swap-labs/
├── .env.example              # Plantilla de variables (NO commitear .env real)
├── .gitignore
├── package.json              # type: module, tsx, dotenv
├── tsconfig.json
├── README.md
├── scripts/
│   ├── check-env.ts          # Valida conectividad Horizon + Soroban RPC
│   └── lib/logger.ts         # Logger JSONL centralizado
├── docs/
│   ├── ARCHITECTURE.md       # Diagrama de arquitectura del sistema
│   ├── SUCCESS_CASES.md      # Casos de éxito con txHash reales
│   ├── API_REFERENCE.md      # Referencia de contratos Soroban
│   ├── DEPLOYMENT.md         # Guía de despliegue paso a paso
│   └── MODELO-MENTAL.md      # x*y=k, impacto, slippage, economía del pool
├── contracts/
│   ├── amm-simple/           # Contrato AMM x*y=k (código fuente Rust)
│   └── simple-token/         # Contrato Token Soroban (código fuente Rust)
├── labs/
│   ├── lab1-sdex/            # Scripts 01-05 + RESULTS.md (T1-T6)
│   ├── lab2-soroban/         # Scripts 02-04 + RESULTS.md (T7-T12)
│   └── lab3-benchmark/       # run-matrix.ts + RESULTS.md
└── logs/                     # JSONL por operación (no commitear)
```

---

<a name="fase-0"></a>
## 🚀 Fase 0 — Entorno

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar plantilla y rellenar con valores reales
cp .env.example .env
# editar .env con SEED_ORIGEN, SENDER_SECRET, SOROSWAP_API_KEY, TOKEN_A, TOKEN_B, etc.

# 3. Validar conectividad Testnet
npm run check-env
```

El script `check-env.ts` valida que Horizon y Soroban RPC respondan correctamente en testnet.

---

<a name="lab-1"></a>
## 🔄 Lab 1 — SDEX / Path Payments (Nivel de Protocolo)

Sin contratos inteligentes. Utiliza operaciones nativas de Stellar.

```bash
npm run lab1:fund   # 01: Fondar cuentas + trustline USDC
npm run lab1:offer  # 02: Publicar Manage Sell Offer
npm run lab1:paths  # 03: Consultar rutas strict-send / strict-receive
npm run lab1:swap   # 04: Ejecutar Path Payment (T1-T6)
npm run lab1:verify # 05: Verificar balances antes y después
```

### Casos de Prueba (T1–T6)

| ID | Caso | Resultado | Tx Hash |
|----|------|-----------|---------|
| T1 | Strict Send, `destMin` holgado | ✅ Éxito | `0207336b432e...` |
| T2 | Strict Send, `destMin` imposible | ✅ Falló (`op_under_dest_min`) | — |
| T3 | Strict Receive, `sendMax` holgado | ✅ Éxito | `5b49ce134675...` |
| T4 | Strict Receive, `sendMax` insuficiente | ✅ Falló (`op_over_source_max`) | — |
| T5 | Ruta sin liquidez | ✅ 0 rutas para 10M USDC | — |
| T6 | Trustline faltante | ✅ `op_no_trust` confirmado | — |

### Balances Verificados (Lab 1)

| Cuenta | XLM | USDC |
|--------|-----|------|
| Sender | 9976.12 | 0.0000000 |
| Receiver | 9999.99 | 18.4705758 |

---

<a name="lab-2"></a>
## ⚡ Lab 2 — AMM Soroban (Nivel de Contrato)

Contrato inteligente desplegado en Soroban Testnet con invariante `x*y=k` y fee 0.30%.

### Contratos Desplegados

| Contrato | ID | Descripción |
|----------|-----|-------------|
| **AMM Simple** | `CB2VAYZJMJ5FGSCUK73DCXITNPKCNN4J466BVBEMWIZ3FU4QMTUOHV76` | Pool x*y=k, fee 0.30% |
| **Token A** | `CAGZ57WF5Z6T6AMG2YH6MUXLA6SMWASQQ62DXJQRJO5IQKX7OLHTZHTS` | Token de prueba TKA |
| **Token B** | `CDOOW7CLAMWBAOSP2OWDJRCCIU6VJS6PGIAEOK4QGMM72TFULF3E3VZN` | Token de prueba TKB |

```bash
npm run lab2:quote  # 02: Cotizar EXACT_IN
npm run lab2:swap   # 03: Ejecutar swap (T7-T12)
npm run lab2:verify # 04: Verificar balances y reservas
```

### Casos de Prueba (T7–T12)

| ID | Caso | Resultado | Tx Hash |
|----|------|-----------|---------|
| T7 | Swap EXACT_IN pequeño | ✅ Éxito | `78b1c68d1f01...` |
| T8 | Swap EXACT_IN grande | ✅ Éxito (impacto visible) | `4d35615be5bc...` |
| T9 | amountOutMin imposible | ✅ Falló (slippage) | — |
| T10 | Deadline expirado | ✅ Falló (revertido) | — |
| T11 | Reservas x*y=k | ✅ Invariante cumple | — |
| T12 | Swap EXACT_OUT | ✅ Éxito | `a7b761734a2c...` |

### Impacto de Precio (AMM)

| Tamaño | amountIn | amountOut | Precio Efectivo | Impacto |
|--------|----------|-----------|-----------------|---------|
| Pequeño | 10,000,000 | 8,312,489 | 0.831 B/A | ~1.2% |
| Grande | 100,000,000 | 26,030,217 | 0.260 B/A | ~74% |

---

<a name="lab-3"></a>
## 📊 Lab 3 — Benchmark Comparativo

```bash
npx tsx labs/lab3-benchmark/run-matrix.ts
```

### Resultados (Soroban AMM v2)

| Tamaño | Motor | amountIn | amountOut | priceImpact | Tx Hash |
|--------|-------|----------|-------------|-----------|
| Pequeño | SDEX | 1,000,000 | — | — | — |
| Pequeño | Soroban | 1,000,000 | 10,021 | -0.40% | `e20c3a93...` |
| Medio | SDEX | 10,000,000 | — | — | — |
| Medio | Soroban | 10,000,000 | 98,053 | -3.88% | `7eafcc25...` |
| Grande | SDEX | 100,000,000 | — | — | — |
| Grande | Soroban | 100,000,000 | 803,925 | -30.07% | `71a54147...` |

**Nota:** SDEX requiere una oferta en el libro de órdenes (Manage Sell Offer) publicada desde la cuenta Sender para tener liquidez.

---

<a name="contratos"></a>
## 📜 Contratos Desplegados en Testnet

| Contrato | ID | Funciones Principales |
|----------|-----|----------------------|
| AMM Simple | `CB2VAYZJMJ5FGSCUK73DCXITNPKCNN4J466BVBEMWIZ3FU4QMTUOHV76` | `initialize`, `swap`, `swap_exact_out`, `get_reserves`, `get_price` |
| Token A | `CAGZ57WF5Z6T6AMG2YH6MUXLA6SMWASQQ62DXJQRJO5IQKX7OLHTZHTS` | `initialize`, `mint`, `transfer`, `balance` |
| Token B | `CDOOW7CLAMWBAOSP2OWDJRCCIU6VJS6PGIAEOK4QGMM72TFULF3E3VZN` | `initialize`, `mint`, `transfer`, `balance` |

Ver en [Stellar Lab Testnet](https://lab.stellar.org/r/testnet/contract/CB2VAYZJMJ5FGSCUK73DCXITNPKCNN4J466BVBEMWIZ3FU4QMTUOHV76).

---

<a name="casos-exito"></a>
## ✅ Casos de Éxito — Transacciones Reales

Todas las transacciones están registradas en `logs/` y pueden verificarse en [stellar.expert testnet](https://stellar.expert/explorer/testnet).

### Transacciones Destacadas

| Lab | Caso | Tx Hash | Enlace |
|-----|------|---------|--------|
| Lab 1 | T1 Strict Send | `0207336b432e18b9e55658d84c76d8b79c028224476e0a4098b1961a1a9ebb7e` | [Ver](https://stellar.expert/explorer/testnet/tx/0207336b432e18b9e55658d84c76d8b79c028224476e0a4098b1961a1a9ebb7e) |
| Lab 1 | T3 Strict Receive | `5b49ce134675ae464c7e4eac6b6906da1a77df74bfe7c4cf185767c32816c7b1` | [Ver](https://stellar.expert/explorer/testnet/tx/5b49ce134675ae464c7e4eac6b6906da1a77df74bfe7c4cf185767c32816c7b1) |
| Lab 1 | Oferta SDEX | `151dbe7ac7538bebfeadce97383a2ce658ba3a1229cfc9dd5e93184f61f9e285` | [Ver](https://stellar.expert/explorer/testnet/tx/151dbe7ac7538bebfeadce97383a2ce658ba3a1229cfc9dd5e93184f61f9e285) |
| Lab 2 | T7 Swap pequeño | `78b1c68d1f01d9ff3fbf0407b883e8026b08bc90acf7268c994e2964979bd4ec` | [Ver](https://stellar.expert/explorer/testnet/tx/78b1c68d1f01d9ff3fbf0407b883e8026b08bc90acf7268c994e2964979bd4ec) |
| Lab 2 | T8 Swap grande | `4d35615be5bc76f42211be4c2cf39c52ccd457d88664c903dcbeebd6aaeba752` | [Ver](https://stellar.expert/explorer/testnet/tx/4d35615be5bc76f42211be4c2cf39c52ccd457d88664c903dcbeebd6aaeba752) |
| Lab 3 | Swap pequeño | `e20c3a934b699a2cd2a03a397467e8160b854b38946ac8fb05f8bea5cca687ae` | [Ver](https://stellar.expert/explorer/testnet/tx/e20c3a934b699a2cd2a03a397467e8160b854b38946ac8fb05f8bea5cca687ae) |
| Lab 3 | Swap medio | `7eafcc25b80994d389b972e6c9ab3a4f2d11ec7e1cac721925ca4c070c4a9557` | [Ver](https://stellar.expert/explorer/testnet/tx/7eafcc25b80994d389b972e6c9ab3a4f2d11ec7e1cac721925ca4c070c4a9557) |
| Lab 3 | Swap grande | `71a54147b9867204bca8be8e408c7e714d35ab4b38fb4ff82b170ff0848b6ac5` | [Ver](https://stellar.expert/explorer/testnet/tx/71a54147b9867204bca8be8e408c7e714d35ab4b38fb4ff82b170ff0848b6ac5) |
| Lab 2 | T12 EXACT_OUT | `a7b761734a2c4708a40e7cf9e39f91e3cfe86cc2e99f606b622067520593743b` | [Ver](https://stellar.expert/explorer/testnet/tx/a7b761734a2c4708a40e7cf9e39f91e3cfe86cc2e99f606b622067520593743b) |

Ver todos los casos en [`docs/SUCCESS_CASES.md`](docs/SUCCESS_CASES.md).

---

<a name="documentacion"></a>
## 📚 Documentación Adicional

| Documento | Descripción |
|-----------|-------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Diagrama de arquitectura del sistema |
| [`docs/SUCCESS_CASES.md`](docs/SUCCESS_CASES.md) | Casos de éxito con txHash y enlaces |
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | Referencia de funciones de contratos |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Guía de despliegue paso a paso |
| [`docs/MODELO-MENTAL.md`](docs/MODELO-MENTAL.md) | x*y=k, impacto, slippage, economía del pool |

---

<a name="seguridad"></a>
## 🔒 Seguridad

- ✅ `.env` está en `.gitignore` — nunca commitear secretos
- ✅ `logs/` está en `.gitignore` — JSONL no commitearse
- ✅ `contracts/*/target/` en `.gitignore` — build artifacts de Rust
- ✅ Placeholders en `.env.example` (sin secretos reales)
- Verificar antes de commitear: `grep -r "S[A-Z][A-Z0-9]{40,}" --exclude-dir=node_modules .`

---

<a name="referencias"></a>
## 🔗 Referencias Oficiales

| Tema | Enlace |
|------|--------|
| Stellar Path Payments | https://developers.stellar.org/docs/build/guides/transactions/path-payments |
| Soroswap AMM | https://docs.soroswap.finance/amm/how-it-works |
| Soroban Smart Contracts | https://developers.stellar.org/docs/build/smart-contracts |
| Stellar CLI | https://developers.stellar.org/docs/tools/cli-reference |
| Friendbot Testnet | https://friendbot.stellar.org |
| Stellar Expert Testnet | https://stellar.expert/explorer/testnet |

---

## 📄 Licencia

MIT — Uso educativo y de demostración.
