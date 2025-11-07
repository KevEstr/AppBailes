# Scripts para Relacionar Receipts de Octubre con Monthly Payments

## Descripción

Estos scripts validan y relacionan los receipts creados en octubre con sus respectivos monthly-payments basándose en:
- Mismo estudiante (`studentId`)
- Coincidencia de mes en `concept` (receipt) y `notes` (monthly-payment) - busca "octubre" o variaciones
- Coincidencia de año entre el receipt y el periodo del monthly-payment
- Coincidencia de monto (`amount` del receipt vs `expectedAmount` del payment)

## Scripts Disponibles

### 1. Dry-Run (Validación sin cambios)
**Archivo:** `link-october-receipts-dry-run.js`

Este script muestra qué cambios se realizarían **sin ejecutarlos**. Úsalo primero para validar las coincidencias.

```bash
node scripts/link-october-receipts-dry-run.js
```

**Salida:**
- Lista de coincidencias perfectas (amounts match)
- Lista de coincidencias con diferencias de monto
- Lista de receipts sin coincidencias
- Estadísticas detalladas

### 2. Ejecutor (Aplica los cambios)
**Archivo:** `link-october-receipts.js`

Este script ejecuta los cambios en la base de datos. **Solo ejecútalo después de validar con el dry-run**.

```bash
node scripts/link-october-receipts.js
```

## Cambios que Realiza

Para cada coincidencia válida, el script:

1. **Actualiza el Receipt:**
   - `monthlyPaymentId` = ID del monthly-payment encontrado

2. **Actualiza el Monthly Payment:**
   - `status` = `PAID`
   - `paidAmount` = amount del receipt
   - `paymentDate` = fecha de creación del receipt (`createdAt`)
   - `approvedBy` = `"1"`
   - `receivedAt` = fecha de creación del receipt (`createdAt`)
   - `markedAsPaidBy` = `"1"`
   - `paymentMethod` = método de pago del receipt

## Criterios de Coincidencia

El script usa un sistema de scoring para encontrar la mejor coincidencia:

- **+15 puntos:** Coincidencia de año (receipt y payment period)
- **+10 puntos:** Ambos contienen "octubre" en concept/notes
- **+5 puntos:** Mismo estudiante
- **+20 puntos:** Coincidencia exacta de monto (diferencia < $0.01)
- **+15 puntos:** Diferencia de monto aceptable (hasta $5000 por descuentos)
- **+10 puntos:** Diferencia de monto menor al 5%

**Requisitos mínimos:**
- Score mínimo: 20 puntos
- Coincidencia obligatoria de año
- Coincidencia de monto (diferencia <= $5000 para tolerar descuentos)

## Años Soportados

El script busca receipts de octubre desde 2020 hasta 2025. Si necesitas otros años, modifica el array de fechas en ambos scripts.

## Notas Importantes

⚠️ **IMPORTANTE:**
- Siempre ejecuta primero el **dry-run** para validar las coincidencias
- El script solo relaciona receipts que **NO** tienen `monthlyPaymentId` asignado
- Solo relaciona cuando los amounts coinciden exactamente (tolerancia de $0.01)
- El script requiere que el `concept` del receipt o las `notes` del payment contengan "octubre"

## Ejemplo de Uso

```bash
# 1. Primero, validar qué se haría
node scripts/link-october-receipts-dry-run.js

# 2. Revisar la salida y confirmar que las coincidencias son correctas

# 3. Si todo está bien, ejecutar los cambios
node scripts/link-october-receipts.js
```

## Troubleshooting

**Problema:** No encuentra coincidencias
- Verifica que los receipts tengan "octubre" en el `concept`
- Verifica que los monthly-payments tengan "octubre" en las `notes`
- Verifica que los años coincidan entre receipt y payment period

**Problema:** Encuentra coincidencias pero no las relaciona
- Verifica que los amounts coincidan (diferencia <= $5000)
- Verifica que el score de coincidencia sea >= 20

## Tolerancia de Descuentos

El script acepta diferencias de hasta **$5000** entre el monto del receipt y el expectedAmount del payment para permitir descuentos aplicados. Si la diferencia es mayor a $5000, no se relacionarán automáticamente.

