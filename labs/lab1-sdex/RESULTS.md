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
| T1 | Path Payment Strict Send, ruta directa, `destMin` holgado | ✅ éxito | ✅ completado | `09b811004db70ecc43421fb2e45b47cce2588e07a1fd7cd4c41339a16b4e1870` |
| T2 | Path Payment Strict Send, `destMin` imposible | ❌ debe fallar (slippage) | ✅ completado (`op_under_dest_min`) | — |
| T3 | Path Payment Strict Receive, `sendMax` holgado | ✅ éxito | ⬜ pendiente | — |
| T4 | Path Payment Strict Receive, `sendMax` insuficiente | ❌ debe fallar (slippage) | ⬜ pendiente | — |
| T5 | Consulta de rutas sin liquidez suficiente | respuesta vacía / controlada | ⬜ pendiente | — |
| T6 | Trustline faltante en destino | operación rechazada (`op_no_trust`) | ⬜ pendiente | — |

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
