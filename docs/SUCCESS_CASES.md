# Casos de Éxito — Transacciones Reales en Stellar Testnet

Todas las transacciones pueden verificarse en https://stellar.expert/explorer/testnet

## Resumen de Transacciones Exitosas

| # | Lab | Caso | Motor | Tx Hash | Estado |
|---|-----|------|-------|---------|--------|
| 1 | Lab 1 | T1: Strict Send exitoso | SDEX | `0207336b432e18b9e55658d84c76d8b79c028224476e0a4098b1961a1a9ebb7e` | ✅ |
| 2 | Lab 1 | T3: Strict Receive exitoso | SDEX | `5b49ce134675ae464c7e4eac6b6906da1a77df74bfe7c4cf185767c32816c7b1` | ✅ |
| 3 | Lab 1 | Oferta SDEX publicada | SDEX | `151dbe7ac7538bebfeadce97383a2ce658ba3a1229cfc9dd5e93184f61f9e285` | ✅ |
| 4 | Lab 2 | T7: Swap pequeño (1 uni) | Soroban | `78b1c68d1f01d9ff3fbf0407b883e8026b08bc90acf7268c994e2964979bd4ec` | ✅ |
| 5 | Lab 2 | T8: Swap grande (10 uni) | Soroban | `4d35615be5bc76f42211be4c2cf39c52ccd457d88664c903dcbeebd6aaeba752` | ✅ |
| 6 | Lab 3 | T7: Swap pequeño | Soroban v2 | `e20c3a934b699a2cd2a03a397467e8160b854b38946ac8fb05f8bea5cca687ae` | ✅ |
| 7 | Lab 3 | T8 medio: Swap medio | Soroban v2 | `7eafcc25b80994d389b972e6c9ab3a4f2d11ec7e1cac721925ca4c070c4a9557` | ✅ |
| 8 | Lab 3 | T8 grande: Swap grande | Soroban v2 | `71a54147b9867204bca8be8e408c7e714d35ab4b38fb4ff82b170ff0848b6ac5` | ✅ |
| 9 | Lab 2 | T12: Swap EXACT_OUT | Soroban v2 | `a7b761734a2c4708a40e7cf9e39f91e3cfe86cc2e99f606b622067520593743b` | ✅ |

## Enlaces Directos (Stellar Expert Testnet)

| Transacción | Enlace |
|-------------|--------|
| Lab 1 T1 | https://stellar.expert/explorer/testnet/tx/0207336b432e18b9e55658d84c76d8b79c028224476e0a4098b1961a1a9ebb7e |
| Lab 1 T3 | https://stellar.expert/explorer/testnet/tx/5b49ce134675ae464c7e4eac6b6906da1a77df74bfe7c4cf185767c32816c7b1 |
| Lab 1 Oferta | https://stellar.expert/explorer/testnet/tx/151dbe7ac7538bebfeadce97383a2ce658ba3a1229cfc9dd5e93184f61f9e285 |
| Lab 2 T7 | https://stellar.expert/explorer/testnet/tx/78b1c68d1f01d9ff3fbf0407b883e8026b08bc90acf7268c994e2964979bd4ec |
| Lab 2 T8 | https://stellar.expert/explorer/testnet/tx/4d35615be5bc76f42211be4c2cf39c52ccd457d88664c903dcbeebd6aaeba752 |
| Lab 3 Pequeño | https://stellar.expert/explorer/testnet/tx/e20c3a934b699a2cd2a03a397467e8160b854b38946ac8fb05f8bea5cca687ae |
| Lab 3 Medio | https://stellar.expert/explorer/testnet/tx/7eafcc25b80994d389b972e6c9ab3a4f2d11ec7e1cac721925ca4c070c4a9557 |
| Lab 3 Grande | https://stellar.expert/explorer/testnet/tx/71a54147b9867204bca8be8e408c7e714d35ab4b38fb4ff82b170ff0848b6ac5 |
| Lab 2 T12 EXACT_OUT | https://stellar.expert/explorer/testnet/tx/a7b761734a2c4708a40e7cf9e39f91e3cfe86cc2e99f606b622067520593743b |

## Contratos en Lab Stellar

| Contrato | Enlace |
|----------|--------|
| AMM Simple v2 | https://lab.stellar.org/r/testnet/contract/CB2VAYZJMJ5FGSCUK73DCXITNPKCNN4J466BVBEMWIZ3FU4QMTUOHV76 |
| Token A | https://lab.stellar.org/r/testnet/contract/CAGZ57WF5Z6T6AMG2YH6MUXLA6SMWASQQ62DXJQRJO5IQKX7OKHTZHTS |
| Token B | https://lab.stellar.org/r/testnet/contract/CDOOW7CLAMWBAOSP2OWDJRCCIU6VJS6PGIAEOK4QGMM72TFULF3E3VZN |

## Resultados Detallados

### Lab 1 — SDEX

| Caso | Entrada | Salida | Estado |
|------|---------|--------|--------|
| T1 Strict Send | 10 XLM | 7.7352931 USDC | ✅ Éxito |
| T3 Strict Receive | ≤10 XLM | 3 USDC | ✅ Éxito |

### Lab 2 — Soroban AMM

| Caso | amountIn | amountOut | priceImpact | Estado |
|------|----------|-----------|-------------|--------|
| T7 pequeño | 10,000,000 | 8,312,489 | -16.9% | ✅ Éxito |
| T8 grande | 100,000,000 | 26,030,217 | -74% | ✅ Éxito |
| T12 EXACT_OUT | 5,000,000 (B) | 5,572,271 (A) | - | ✅ Éxito |

### Lab 3 — Benchmark Soroban

| Tamaño | amountIn | amountOut | priceImpact | Tx Hash |
|--------|----------|-----------|-------------|---------|
| Pequeño | 1,000,000 | 10,021 | -0.40% | `e20c3a93...` |
| Medio | 10,000,000 | 98,053 | -3.88% | `7eafcc25...` |
| Grande | 100,000,000 | 803,925 | -30.07% | `71a54147...` |

## Casos de Fallo Controlado (Slippage Protection)

| Lab | Caso | Condición | Error | Resultado |
|-----|------|-----------|-------|-----------|
| Lab 1 | T2 | `destMin=9999` | `op_under_dest_min` | ✅ Revertido |
| Lab 1 | T4 | `sendMax=1` | `op_over_source_max` | ✅ Revertido |
| Lab 2 | T9 | `amount_out_min` imposible | `amount_out_min not met` | ✅ Revertido |
| Lab 2 | T10 | `deadline=0` | `deadline expired` | ✅ Revertido |

## Invariante x*y=k

| Momento | Reserva A | Reserva B | k = A×B |
|---------|-----------|-----------|---------|
| Inicial | 50,000,000 | 50,000,000 | 2.5×10¹⁵ |
| Post T7+T8 | 159,670,000 | 15,657,294 | ≈2.5×10¹⁵ |

**Conclusión:** El invariante del producto constante se cumple.
