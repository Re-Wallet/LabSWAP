# Lab 2 — AMM Soroban (Contrato Propio x*y=k) — Resultados

> Lab de nivel de contrato (smart contracts). Ejecutado en **Soroban Testnet**.
> Lógica: producto constante x*y = k, comisión 0.30%.
> Contrato desplegado de forma independiente (ingeniería inversa, sin Soroswap SDK).

## Contratos desplegados en Testnet

| Contrato | ID |
|----------|-----|
| AMM (x*y=k, fee 0.3%) | `CAY2WCEZCKDQV2QNTZP7QN2WCKVAQUXA2M7ADINTHUAN3BO2S27RBJHA` |
| Token A | `CAGZ57WF5Z6T6AMG2YH6MUXLA6SMWASQQ62DXJQRJO5IQKX7OKHTZHTS` |
| Token B | `CDOOW7CLAMWBAOSP2OWDJRCCIU6VJS6PGIAEOK4QGMM72TFULF3E3VZN` |

## Reservas del pool

| Momento | Reserva A | Reserva B | k = a×b |
|---------|-----------|-----------|---------|
| Inicial | 50,000,000 | 50,000,000 | 2.5×10¹⁵ |
| Después T7+T8 | 159,670,000 | 15,657,294 | ≈2.5×10¹⁵ |

## Matriz de casos de prueba

| ID | Caso | Esperado | Estado | Evidencia (txHash) |
|----|------|----------|--------|---------------------|
| T7 | Swap EXACT_IN monto pequeño (1 unidad) | output ≈ cotización | ✅ completado | `78b1c68d1f01d9ff3fbf0407b883e8026b08bc90acf7268c994e2964979bd4ec` |
| T8 | Swap EXACT_IN monto grande (100 unidades) | impacto de precio > T7 | ✅ completado | `4d35615be5bc76f42211be4c2cf39c52ccd457d88664c903dcbeebd6aaeba752` |
| T9 | Swap con amountOutMin superior al output | revertido (slippage) | ✅ completado (panic) | — |
| T10 | Swap con deadline expirado | revertido | ⚠️ no implementado (contrato simple) | — |
| T11 | Reservas antes/después: x'·y' ≥ k | ✅ invariante se cumple | ✅ completado | — |
| T12 | (Opcional) Swap EXACT_OUT | si el contrato lo soporta | ⚠️ no implementado | — |

## Resultados numéricos

| Caso | amountIn | amountOut | Precio efectivo | Precio spot | Impacto |
|------|----------|-----------|-----------------|-------------|---------|
| T7 | 10,000,000 (1 uni) | 8,312,489 | 1.203 | 1.000 | ~1.2% |
| T8 | 100,000,000 (10 uni) | 26,030,217 | 3.841 | 1.000 | ~74% |

## Conclusión

- **T7/T8**: El impacto de precio crece con el tamaño de la operación relativa a las reservas (regla x*y=k).
- **T9**: El contrato revierte cuando `amount_out_min` no se cumple (protección contra slippage).
- **T11**: `k_final ≈ k_inicial` (diferencia por redondeo entero), confirmando el invariante del producto constante.

## Referencias

- Soroswap AMM: https://docs.soroswap.finance/amm/how-it-works
- Soroban: https://developers.stellar.org/docs/build/smart-contracts
