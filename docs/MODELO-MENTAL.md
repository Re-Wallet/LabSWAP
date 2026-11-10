# Modelo Mental — El corazón del swap y su economía

> Documento de referencia para los Labs 1, 2 y 3.
> Objetivo: fijar el modelo mental agnóstico antes de tocar código.

---

## 1. El motor: invariante de producto constante (`x * y = k`)

- `x`, `y`: reservas de los dos tokens del pool.
- `k`: constante que el protocolo preserva (descontando fees) en cada swap.
- El precio **no lo pone una persona**: lo dicta la escasez relativa.
  - Precio marginal (spot): `y / x`.
  - Precio efectivo de un swap: `Δx / Δy` (siempre peor que el marginal).

Fórmula de output para un `EXACT_IN` con fee `f`:

Δx_neto = Δx * (1 - f)
Δy = (y * Δx_neto) / (x + Δx_neto)

Regla práctica de impacto: price_impact ≈ 2 * (Δx / x) (para Δx pequeños frente a x)

---

## 2. El producto real: cotización permanente

El AMM no vende "tokens"; vende **disponibilidad 24/7 a cualquier monto
sin contraparte humana**. El precio de ese servicio es la **fee**, que se
queda en el pool y remunera a los LPs.

Un pool sobrevive si, de forma sostenida:

ingreso por fees > pérdida por divergencia + costo de oportunidad
volumen × fee > IL realizada + tasa libre de riesgo × capital

Si se rompe la desigualdad → LPs retiran liquidez → pool se hace poco
profundo → impacto sube → usuarios migran → pool muere. Es un círculo en
ambas direcciones.

---

## 3. Las tres fuerzas del pool

| Fuerza            | Qué hace                                              | Signo para el LP |
|-------------------|-------------------------------------------------------|------------------|
| Fees              | 0.01%–1% según tier por swap                          | +                |
| Arbitraje         | Alinea el precio del pool con el mercado externo      | − (extrae valor) |
| Divergencia (IL)  | Si el precio relativo se mueve, la canasta empeora    | −                |

El LP es, en la práctica, **la contraparte del arbitrajista**. Gana si el
volumen orgánico (usuarios que pagan fee por conveniencia) supera el valor
que el arbitraje extrae.

---

## 4. Ejercicio numérico guiado (para el Lab 3)

**Pool inicial**: 100 XLM / 100 USDC. `k = 10,000`. Precio spot = 1 USDC/XLM.

### Caso A — swap pequeño (usuario normal)
Swap `Δx = 1 XLM` a cambio de USDC. Fee 0.3%.

1. `Δx_neto = 1 * 0.997 = 0.997`
2. `Δy = (100 * 0.997) / (100 + 0.997) = 99.7 / 100.997 ≈ 0.9872 USDC`
3. Precio efectivo: `1 / 0.9872 ≈ 1.0130 USDC/XLM`
4. Impacto ≈ `0.9872 / 1 - 1 ≈ -1.28%` en el precio del XLM en el pool.
5. Fee cobrada al usuario: `1 * 0.003 = 0.003 XLM` (queda en el pool).
6. Nuevas reservas: `x' = 101`, `y' = 100 - 0.9872 = 99.0128`.
   `k' = 101 * 99.0128 ≈ 10,000.29 ≥ 10,000` ✅

**Lectura**: el usuario pagó ~1.28% de impacto + 0.3% de fee. El pool
quedó con precio spot `99.0128 / 101 ≈ 0.9803 USDC/XLM` (XLM más caro
dentro del pool que afuera si el mercado externo sigue en 1.0).

### Caso B — swap grande (arbitrajista o ballena)
Mismo pool, `Δx = 10 XLM`.

1. `Δx_neto = 9.97`
2. `Δy = (100 * 9.97) / (100 + 9.97) = 997 / 109.97 ≈ 9.0661 USDC`
3. Precio efectivo: `10 / 9.0661 ≈ 1.1030 USDC/XLM`
4. Impacto ≈ `9.0661/10 - 1 ≈ -9.34%` (regla aproximada: `2*10/100 = 20%`
   sobreestima; la fórmula exacta manda).
5. Nuevas reservas: `x' = 110`, `y' = 90.9339`.
   Precio spot post-swap: `90.9339 / 110 ≈ 0.8267 USDC/XLM`.

**Lectura**: ahora el pool cotiza XLM a 0.827 USDC mientras el mercado
externo lo tiene a 1.0. **Aquí entra el arbitrajista**: compra XLM barato
en el pool (pagando USDC) hasta que el precio vuelva a ~1.0. Ese
arbitraje devuelve el precio a la normalidad, pero **se lleva la
diferencia**: el LP pagó esa factura.

### Caso C — el LP hace las cuentas
Imagina que el LP entró con 100 XLM + 100 USDC (valor total = 200 USD a
precio 1.0) y, tras una serie de swaps + arbitraje, el precio externo del
XLM subió a 2.0 USDC.

- Si el LP hubiera **holdeado**: tendría 100 XLM (→200 USDC) + 100 USDC
  = **300 USDC**.
- Si el LP está **en el pool**: por `x*y=k`, con precio 2.0, las reservas
  se rebalancean a `x ≈ 70.71 XLM`, `y ≈ 141.42 USDC`.
  Valor: `70.71 * 2 + 141.42 ≈ 282.84 USDC`.
- **IL ≈ 282.84 - 300 = -17.16 USD** (≈ -5.72% frente a hold).

Ese -5.72% es el costo de proveer liquidez. El LP solo gana si las fees
acumuladas en el período **superan** ese -5.72%. Ahí está la decisión
económica real.

---

## 5. El sistema inmune: arbitraje

- El invariante `x*y=k` garantiza que **nadie pueda sacar valor gratis
  del pool** en una sola operación.
- Pero el precio del pool **se desvía del externo** con cada swap.
- El arbitraje corrige esa desviación → el pool se mantiene útil
  (precio cercano al real) → pero **el arbitrajista cobra** esa
  corrección, y la paga el LP.

Un pool con mucho arbitraje y poco volumen orgánico es un pool que
todavía no sabe que está muerto.

---

## 6. Lo que decide la carrera (no es la fórmula)

1. **Profundidad**: más reservas → menos impacto → más usuarios → más
   volumen → más fees → más LPs. Efecto de red.
2. **Fee tier correcto al par**: stablecoins 0.01–0.05%, volátiles 0.3%.
3. **Incentivos (liquidity mining)**: vida artificial; cuando terminan,
   la liquidez mercenaria se va si el fee orgánico no alcanza.
4. **Routing / agregadores**: aparecer en la mejor ruta trae volumen
   externo. En Stellar, los Path Payments cumplen ese rol.
5. **Integración real**: pagos, colateral, wallets. Demanda estructural
   > demanda especulativa.

---

## 7. Stellar: dos motores, un mismo problema económico

| Aspecto        | SDEX (protocolo)                         | AMM Soroban (contrato)                   |
|----------------|-------------------------------------------|-------------------------------------------|
| Quién provee   | Market makers profesionales con órdenes  | LPs pasivos con capital en el pool        |
| Cómo gana      | Spread + gestión activa de inventario    | Fees − divergencia − arbitraje            |
| Ventaja        | Integración nativa (Path Payments)       | Cotización siempre disponible y predecible|
| Riesgo propio  | Libro vacío en pares nicho               | IL + arbitraje + dependencia de incentivos|
| Conviven       | Los Path Payments pueden rutear entre ambos motores                     |

Ninguno "mata" al otro: el mercado decide, par por par y tamaño por
tamaño, cuál es más eficiente.

---

## 8. Resumen en una línea

> El swap sobrevive porque convierte la necesidad de liquidez inmediata
> en un flujo de fees que paga a quien asume el riesgo de inventario.
> Si ese flujo deja de cubrir el costo del riesgo (divergencia +
> arbitraje), el capital se va y el pool muere. El invariante `x*y=k` es
> la constitución que evita robos dentro del pool; el clima que decide
> su supervivencia es el mercado externo.

---

## 9. Checklist de comprensión (para cerrar el Lab 3)

- [ ] Puedo explicar con un ejemplo numérico por qué el precio efectivo
      es peor que el marginal.
- [ ] Puedo calcular el output de un swap con fee dado `x`, `y`, `Δx` y `f`.
- [ ] Puedo estimar la IL para un cambio de precio relativo dado.
- [ ] Puedo argumentar cuándo conviene un LP activo (SDEX) vs. uno pasivo
      (AMM) para un par concreto.
- [ ] Puedo identificar, dado un pool real, si está subsidiado o si sus
      fees orgánicas sostienen la liquidez.
