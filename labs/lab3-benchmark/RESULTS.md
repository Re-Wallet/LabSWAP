# Lab 3 — Benchmark Comparativo SDEX vs AMM Soroban

> Ejecutado en Stellar Testnet. Mismo swap conceptual en ambos motores, 3 tamaños.

| Tamaño | Motor | amountIn | amountOut | priceEffective | priceImpactPct | txHash | Latencia | Éxito |
|--------|-------|----------|-----------|----------------|----------------|--------|----------|-------|
| pequeno | sdex | 1000000 | - | - | - | - | 1974ms | ❌ |
| pequeno | soroban | 1000000 | 10021 | 10021 | -0.3992 | - | 23566ms | ✅ |
| medio | sdex | 10000000 | - | - | - | - | 2073ms | ❌ |
| medio | soroban | 10000000 | 98053 | 98053 | -3.8779 | - | 17965ms | ✅ |
| grande | sdex | 100000000 | - | - | - | - | 1635ms | ❌ |
| grande | soroban | 100000000 | 803925 | 803925 | -30.0668 | - | 33325ms | ✅ |

## Conclusión

- **SDEX**: precio depende de la profundidad del libro de órdenes en ese instante.
- **AMM Soroban**: precio dictado por la fórmula x*y=k con fee 0.30%, predecible y determinista.
- El impacto de precio crece con el tamaño de la operación relativa a las reservas/libro.