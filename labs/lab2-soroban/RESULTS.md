# Lab 2 — AMM Soroban (Soroswap) — Resultados

> Lab de nivel de contrato (smart contracts). Ejecutado en **Soroban Testnet**.
> Lógica: producto constante x*y = k, comisión 0.30% (modelo Soroswap).
> Activos: TOKEN_A ↔ TOKEN_B (contract IDs Soroban).

## Scripts

| Script | Descripción |
|--------|-------------|
| `01-init-sdk.ts` | Inicializar SDK Soroswap (red TESTNET) |
| `02-quote.ts` | Obtener cotización EXACT_IN (amountIn → amountOut implícito) |
| `03-swap.ts` | Ejecutar swap EXACT_IN (T7, T8, T9) |
| `04-verify.ts` | Verificar balances on-chain y reservas del pool |

## Requisitos en `.env`

```
SOROSWAP_API_KEY=sk_test_...   # https://api.soroswap.finance
SENDER_SECRET=S...
SENDER_PUBLIC=G...
TOKEN_A=C...token_a
TOKEN_B=C...token_b
PAIR_ID=C...pair_contract      # opcional, para leer reservas
```

## Matriz de casos de prueba

| ID | Caso | Esperado | Estado | Evidencia (txHash) |
|----|------|----------|--------|---------------------|
| T7 | Swap EXACT_IN monto pequeño | output ≈ cotización | ⬜ pendiente | — |
| T8 | Swap EXACT_IN monto grande | impacto de precio > T7 | ⬜ pendiente | — |
| T9 | Swap con amountOutMin superior al output | revertido (slippage) | ⬜ pendiente | — |
| T10 | Swap con deadline expirado | revertido | ⬜ pendiente | — |
| T11 | Reservas antes/después: x'·y' ≥ k | ✅ invariante se cumple | ⬜ pendiente | — |
| T12 | (Opcional) Swap EXACT_OUT | si el contrato lo soporta | ⬜ pendiente | — |

## Logs

Los eventos JSONL se escriben en `logs/lab2/<timestamp>.jsonl` (no commitear si contienen datos sensibles).
Cada operación on-chain registra su `txHash` para auditoría en stellar.expert (testnet).

## Notas

- Opción A (SDK Soroswap): requiere API key válida de testnet y contratos desplegados.
- Opción B (despliegue propio): usar `stellar contract invoke` con el Router (ver especificación).
- T9/T10 requieren parámetros `amount_out_min` y `deadline` que el SDK puede no exponer directamente; en ese caso usar la CLI de Soroban.

## Referencias

- Soroswap AMM: https://docs.soroswap.finance/amm/how-it-works
- SDK Soroswap: https://www.npmjs.com/package/@soroswap/sdk
- Despliegue Soroswap: https://docs.soroswap.finance/amm/technical-reference/deploy-yourself
- Soroban: https://developers.stellar.org/docs/build/smart-contracts
