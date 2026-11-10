# Referencia de API — Contratos Soroban

## Contrato AmmSimple (AMM v2)

**ID:** `CB2VAYZJMJ5FGSCUK73DCXITNPKCNN4J466BVBEMWIZ3FU4QMTUOHV76`  
**Red:** Stellar Testnet  
**WASM Hash:** `c2652974a10d2b55abade829a11b6bc8539846e933fd85082aafb7e40a2b80b8`

### Funciones

#### `initialize(token_a, token_b, amount_a, amount_b)`
Inicializa el pool con reservas iniciales.
- `token_a`: Address del token A
- `token_b`: Address del token B
- `amount_a`: i128, cantidad inicial de A
- `amount_b`: i128, cantidad inicial de B

#### `swap(token_in, token_out, amount_in, amount_out_min, deadline)`
Swap EXACT_IN con protección contra slippage y deadline.
- `token_in`: Address del token de entrada
- `token_out`: Address del token de salida
- `amount_in`: i128, cantidad exacta de entrada
- `amount_out_min`: i128, mínimo aceptable de salida (slippage protection)
- `deadline`: u64, timestamp UNIX máximo (protección contra deadline expirado)
- **Retorna:** i128, amountOut real recibido

#### `swap_exact_out(token_in, token_out, amount_out, amount_in_max, deadline)`
Swap EXACT_OUT — recibe cantidad fija de salida.
- `token_in`: Address del token de entrada
- `token_out`: Address del token de salida
- `amount_out`: i128, cantidad exacta de salida deseada
- `amount_in_max`: i128, máximo aceptable de entrada (slippage protection)
- `deadline`: u64, timestamp UNIX máximo
- **Retorna:** i128, amountIn real pagado

#### `get_reserves(token_a, token_b)`
Obtiene las reservas actuales del pool.
- **Retorna:** `{ a: i128, b: i128 }`

#### `get_price(token_a, token_b)`
Obtiene el precio marginal spot.
- **Retorna:** i128 (precio de B por unidad de A, en unidades base 1e7)

### Ejemplo de Invocación (CLI Stellar)

```bash
stellar contract invoke \
  --id CB2VAYZJMJ5FGSCUK73DCXITNPKCNN4J466BVBEMWIZ3FU4QMTUOHV76 \
  --source labzk-soroban-testnet \
  --network testnet \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- \
  swap \
  --token-in CAGZ57WF5Z6T6AMG2YH6MUXLA6SMWASQQ62DXJQRJO5IQKX7OKHTZHTS \
  --token-out CDOOW7CLAMWBAOSP2OWDJRCCIU6VJS6PGIAEOK4QGMM72TFULF3E3VZN \
  --amount-in 10000000 \
  --amount-out-min 0 \
  --deadline 9999999999
```

## Contrato SimpleToken

**ID Token A:** `CAGZ57WF5Z6T6AMG2YH6MUXLA6SMWASQQ62DXJQRJO5IQKX7OKHTZHTS`  
**ID Token B:** `CDOOW7CLAMWBAOSP2OWDJRCCIU6VJS6PGIAEOK4QGMM72TFULF3E3VZN`

### Funciones

| Función | Parámetros | Descripción |
|---------|------------|-------------|
| `initialize` | admin, decimals, name, symbol | Inicializar token |
| `mint` | to, amount | Acuñar tokens (solo admin) |
| `transfer` | from, to, amount | Transferir tokens |
| `balance` | id | Consultar balance |
| `approve` | from, spender, amount, expiration_latest | Aprobar allowance |
| `transfer_from` | spender, from, to, amount | Transferir con allowance |

### Ejemplo: Mint de tokens

```bash
stellar contract invoke \
  --id CAGZ57WF5Z6T6AMG2YH6MUXLA6SMWASQQ62DXJQRJO5IQKX7OKHTZHTS \
  --source labzk-soroban-testnet \
  --network testnet \
  -- \
  mint \
  --to GB7HSTAIEOATFDIUAEZTCEUCLQLJKXR4F4IM25UQD2T5TC5P7TRVUR3P \
  --amount 100000000
```

## Scripts de Laboratorio

| Script | Comando npm | Descripción |
|--------|-------------|-------------|
| `01-fund-accounts.ts` | `npm run lab1:fund` | Fondar cuentas + trustline USDC |
| `02-publish-offer.ts` | `npm run lab1:offer` | Publicar oferta SDEX |
| `03-query-paths.ts` | `npm run lab1:paths` | Consultar rutas Horizon |
| `04-path-payment.ts` | `npm run lab1:swap` | Ejecutar Path Payment |
| `05-verify.ts` | `npm run lab1:verify` | Verificar balances |
| `02-quote.ts` | `npm run lab2:quote` | Cotizar EXACT_IN |
| `03-swap.ts` | `npm run lab2:swap` | Ejecutar swap (T7-T12) |
| `04-verify.ts` | `npm run lab2:verify` | Verificar reservas |
| `run-matrix.ts` | `npx tsx labs/lab3-benchmark/run-matrix.ts` | Benchmark comparativo |
