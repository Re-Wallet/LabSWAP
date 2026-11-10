# Modelo Mental — SDEX vs AMM Soroban

> Documento de síntesis para los laboratorios de swap en Stellar.
> Explica con palabras propias por qué cada motor fija el precio de forma distinta,
> qué es el impacto de precio y el slippage, y cuándo conviene cada uno.

---

## 1. El SDEX (Stellar Decentralized Exchange) — nivel de protocolo

El SDEX es el libro de órdenes descentralizado nativo del protocolo Stellar.
No hay un contrato inteligente que calcule el precio. El precio lo determina el
**cruce de ofertas de compra y venta** publicadas por los participantes (Market Makers).

### Cómo se fija el precio
Cada oferta (`Manage Sell Offer` / `Manage Buy Offer`) especifica:
- activo que vende y cantidad,
- activo que compra y precio (rate).

Cuando se ejecuta un `Path Payment`, el protocolo recorre las ofertas del libro
desde el mejor precio hacia peores precios hasta completar la cantidad solicitada.
El precio efectivo es el **precio marginal promedio ponderado** de las ofertas
cruzadas, no una fórmula única.

### Propiedades clave
- **Profundidad del libro**: si hay pocas ofertas, un swap grande consume varias
  ofertas a peores precios → alto impacto de precio.
- **Predecibilidad limitada**: el precio depende de qué ofertas existan en el
  instante exacto de la transacción. Puede cambiar entre la consulta de la ruta
  (`/paths/strict-send`) y el envío de la transacción.
- **Protección contra slippage**: `destMin` (Strict Send) y `sendMax`
  (Strict Receive) definen los límites aceptables. Si el precio efectivo queda
  fuera de esos límites, la transacción falla.

---

## 2. El AMM Soroban — nivel de contrato inteligente

El AMM (Automated Market Maker) de Soroswap vive como contrato inteligente en
Soroban. No hay libro de órdenes. Hay **pools de liquidez** con dos reservas:
`x` (reserva de token A) e `y` (reserva de token B).

### Invariante de producto constante
```
x · y = k
```
donde `k` es constante (salvo que se añada o retire liquidez).

Cuando un usuario quiere vender `Δx` de token A para recibir `Δy` de token B,
las nuevas reservas deben cumplir:
```
(x + Δx) · (y - Δy) = k
```
despejando:
```
Δy = y - (k / (x + Δx)) = y - (x·y / (x + Δx))
```

### Cómo se fija el precio
- **Precio marginal** (instantáneo, en el punto actual): `y / x` (cuánto B vale 1 A).
- **Precio efectivo** (de la operación real): `Δy / Δx`. Siempre es **peor** que el
  precio marginal para el operador, porque a medida que se consume el pool,
  el precio se desplaza.

### Comisión (fee) del 0.30%
Soroswap aplica una comisión del 0.30% sobre la entrada. Ese porcentaje se
resta de `Δx` antes de aplicar el cálculo, y el restante se añade a las reservas,
aumentando ligeramente `k` con cada operación (los proveedores de liquidez
reciben esa comisión vía aumento de `k`).

### Propiedades clave
- **Predecibilidad por fórmula**: dado `x`, `y` y `Δx`, el `Δy` exacto se calcula
  antes de enviar. No depende de ofertas de terceros.
- **Impacto de precio determinista**: crece con el tamaño de la operación relativa
  a las reservas. Operación pequeña → precio cercano al marginal. Operación
  grande → precio efectivo muy diferente al marginal.
- **Protección contra slippage**: `amountOutMin` (o `amount_out_min`). Si el
  output real es inferior al mínimo, el contrato revierte la transacción.
- **Pools exclusivos de Soroban**: los pools de Soroban no interactúan con los
  pools nativos del SDEX de Stellar clásico. Son mundos separados.

---

## 3. Impacto de precio vs Slippage

| Concepto | Qué mide | En SDEX | En AMM Soroban |
|----------|----------|---------|----------------|
| **Impacto de precio** | Diferencia entre precio marginal y precio efectivo por el tamaño de la operación | Depende de la profundidad del libro (ofertas disponibles) | Depende del tamaño de Δx relativo a las reservas x, y |
| **Slippage** | Diferencia entre el precio esperado (al consultar) y el precio real (al ejecutar) | Puede ocurrir entre la consulta `/paths` y el envío de la tx | Mínimo si no hay otros swaps entre la quote y el envío |
| **Protección** | `destMin` / `sendMax` | `amountOutMin` | `amountOutMin` |

### Ejemplo numérico (AMM)
Reservas: `x = 1000` XLM, `y = 400` USDC → `k = 400.000`. Precio marginal: 1 XLM = 0.4 USDC.

- Swap de 10 XLM (1% del pool):
  - `Δy = 400 - (400.000 / 1010) ≈ 3.96` USDC
  - Precio efectivo: 3.96 / 10 = 0.396 USDC/XLM (ligeramente peor que 0.4)

- Swap de 100 XLM (10% del pool):
  - `Δy = 400 - (400.000 / 1100) ≈ 36.36` USDC
  - Precio efectivo: 36.36 / 100 = 0.3636 USDC/XLM (mucho peor)

A mayor operación, mayor impacto de precio.

---

## 4. ¿Cuándo conviene cada motor?

| Situación | Motor recomendado | Razón |
|-----------|-------------------|-------|
| Swap pequeño, liquidez profunda en el libro | SDEX | Costo de protocolo bajo, sin necesidad de contrato |
| Swap donde se necesita predecibilidad exacta del output | AMM Soroban | Fórmula x*y=k da output conocido de antemano |
| Swap grande sobre libro poco profundo | AMM Soroban | El impacto es predecible por fórmula; en SDEX depende de ofertas dispersas |
| Ya se tiene liquidez en pools Soroban | AMM Soroban | Los pools son exclusivos; no hay puente nativo con SDEX |
| Operación simple sin querer gestionar contratos | SDEX | Nivel de protocolo, no se despliega ni se invoca ningún contrato |

---

## 5. Conclusión del modelo mental agnóstico

El "corazón del swap" es el mismo en ambos casos: intercambiar una cantidad de
un activo por otra al mejor precio posible, protegiéndose contra slippage.
Lo que cambia es el **motor** que resuelve ese intercambio:

- **SDEX**: protocolo, libro de órdenes, precio = cruce de ofertas, impacto depende de la profundidad del libro en ese instante.
- **AMM Soroban**: contrato inteligente, reservas del pool, precio = fórmula x*y=k, impacto predecible y determinista.

Ambos son válidos; la elección depende del par, el tamaño de la operación y
dónde esté la liquidez.
