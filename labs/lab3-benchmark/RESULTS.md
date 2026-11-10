# Lab 3 — Benchmark Comparativo SDEX vs AMM Soroban

> Ejercicio de síntesis (opcional). Ejecutar SOLO después de completar Lab 1 y Lab 2.
> Mismo swap conceptual una vez vía Path Payment (SDEX) y otra vía AMM Soroban.

## Script

| Script | Descripción |
|--------|-------------|
| `run-matrix.ts` | Ejecuta 3 tamaños (pequeño/medio/grande) en SDEX y Soroban, registra precio efectivo, impacto, latencia, txHash |

## Tablas comparativas

Se generan al ejecutar `run-matrix.ts` en `logs/lab3/` y `labs/lab3-benchmark/RESULTS.md`.

| Tamaño | Motor | amountIn | amountOut | priceEffective | priceImpactPct | txHash | Latencia | Éxito |
|--------|-------|----------|-----------|----------------|----------------|--------|----------|-------|
| *(pendiente de ejecución)* | | | | | | | | |

## Criterios de validación

- [ ] Tabla comparativa completa para los 3 tamaños de operación.
- [ ] Conclusión escrita (máx. 1 página) que explique por qué el AMM produce un impacto de precio predecible por fórmula (x*y=k), mientras que el SDEX depende de la profundidad del libro en ese instante.
- [ ] Identificación del punto donde un motor es más eficiente que el otro para el par probado.

## Requisitos en `.env`

```
SEED_ORIGEN=...          # cuenta con XLM (Lab 1)
PUBLIC_DESTINO=...       # cuenta destino con trustline USDC (Lab 1)
SOROSWAP_API_KEY=...     # https://api.soroswap.finance (Lab 2)
TOKEN_A=... TOKEN_B=...  # contract IDs Soroban (Lab 2)
SENDER_SECRET=... SENDER_PUBLIC=...  # cuenta para Soroban
```

## Referencias

- Path Payments: https://developers.stellar.org/docs/build/guides/transactions/path-payments
- Soroswap AMM: https://docs.soroswap.finance/amm/how-it-works
