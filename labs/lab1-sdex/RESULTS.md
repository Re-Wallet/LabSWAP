# Lab 1 — SDEX / Path Payments — Resultados

> Lab de nivel de protocolo (sin contratos inteligentes). Ejecutado en **Stellar Testnet**.
> Activos: XLM (nativo) ↔ USDC (emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`).

## Scripts

| Script | Descripción |
|--------|-------------|
| `01-fund-accounts.ts` | Fondar cuentas con Friendbot y crear trustline USDC en el destino |
| `02-publish-offer.ts` | Publicar Manage Sell Offer: vender 100 XLM por 40 USDC (precio 2.5 XLM/USDC) |
| `03-query-paths.ts` | Consultar rutas strict-send y strict-receive en Horizon |
| `04-path-payment.ts` | Ejecutar Path Payment Strict Send y Strict Receive (T1–T4) |
| `05-verify.ts` | Verificar balances antes y después |

## Matriz de casos de prueba

| ID | Caso | Esperado | Estado | Evidencia (txHash) |
|----|------|----------|--------|---------------------|
| T1 | Path Payment Strict Send, ruta directa, `destMin` holgado | ✅ éxito | ✅ completado | `0207336b432e18b9e55658d84c76d8b79c028224476e0a4098b1961a1a9ebb7e` |
| T2 | Path Payment Strict Send, `destMin` imposible | ❌ debe fallar (slippage) | ✅ completado (`op_under_dest_min`) | — |
| T3 | Path Payment Strict Receive, `sendMax` holgado | ✅ éxito | ✅ completado | `5b49ce134675ae464c7e4eac6b6906da1a77df74bfe7c4cf185767c32816c7b1` |
| T4 | Path Payment Strict Receive, `sendMax` insuficiente | ❌ debe fallar (slippage) | ✅ completado (`op_over_source_max`) | — |
| T5 | Consulta de rutas sin liquidez suficiente | respuesta vacía / controlada | ⚠️ 1 ruta encontrada (hay liquidez en libro para 10M XLM) | — |
| T6 | Trustline faltante en destino | operación rechazada (`op_no_trust`) | ⚠️ `op_no_destination` (cuenta aleatoria no existe); para `op_no_trust` se necesita cuenta existente sin trustline | — |

## Logs

Los eventos JSONL se escriben en `logs/lab1/<timestamp>.jsonl` (no commitear si contienen datos sensibles).
Cada operación on-chain registra su `txHash` para auditoría en stellar.expert (testnet).

## Notas de ejecución

1. Rellenar `.env` con `SEED_ORIGEN`, `PUBLIC_ORIGEN`, `SEED_DESTINO`, `PUBLIC_DESTINO`.
2. Ejecutar en orden: `01` → `02` → `03` → `04` → `05`.
3. Para T6, ejecutar `04` con una cuenta destino **sin** trustline USDC y verificar el error `op_no_trust`.

## Referencias

- Path Payments: https://developers.stellar.org/docs/build/guides/transactions/path-payments
- Manage Sell Offer: https://developers.stellar.org/docs/data/apis/horizon/api-reference/resources/operations/object/sell-offer
- Friendbot: https://friendbot.stellar.org
