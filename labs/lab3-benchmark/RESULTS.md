# Lab 3 — Benchmark Comparativo SDEX vs AMM Soroban

> Ejecutado en Stellar Testnet. Mismo swap conceptual en ambos motores, 3 tamaños.

| Tamaño | Motor | amountIn | amountOut | priceEffective | priceImpactPct | txHash | Latencia | Éxito |
|--------|-------|----------|-----------|----------------|----------------|--------|----------|-------|
| pequeno | sdex | 1000000 | - | - | - | - | 5731ms | ❌ |
| pequeno | soroban | 1000000 | 3669 | 3669 | -0.2415 | - | 31989ms | ✅ |
| medio | sdex | 10000000 | - | - | - | - | 7458ms | ❌ |
| medio | soroban | 10000000 | 36212 | 36212 | -2.3749 | - | 19492ms | ✅ |
| grande | sdex | 100000000 | - | - | - | - | 6486ms | ❌ |
| grande | soroban | 100000000 | 319619 | 319619 | -20.2023 | - | 43764ms | ✅ |

## Conclusión

- **SDEX**: precio depende de la profundidad del libro de órdenes en ese instante.
- **AMM Soroban**: precio dictado por la fórmula x*y=k con fee 0.30%, predecible y determinista.
- El impacto de precio crece con el tamaño de la operación relativa a las reservas/libro.