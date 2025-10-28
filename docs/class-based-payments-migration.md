# Migración a Pagos Basados en Clases

## Resumen de Cambios

Se ha modificado el sistema de pagos mensuales para soportar múltiples clases por estudiante, donde cada clase puede tener un corte de pago diferente (15 o 30 del mes).

## Cambios Realizados

### 1. Schema de Base de Datos

#### Modificaciones en `ClassEnrollment`:
- ✅ Agregado `paymentCutoffDay` (día de corte: 15 o 30)
- ✅ Agregado `monthlyFee` (mensualidad específica por clase, opcional)

#### Modificaciones en `MonthlyPayment`:
- ✅ Agregado `classId` (relación con la clase específica)
- ✅ Agregado constraint único `(studentId, classId, periodId)`
- ✅ Agregados índices para mejor rendimiento

#### Modificaciones en `StudentEnrollmentData`:
- ✅ Removido `paymentCutoffDay` (ahora está en `ClassEnrollment`)

### 2. Lógica de Negocio

#### `MonthlyPaymentService`:
- ✅ Modificado `generateMonthlyPayments()` para generar un pago por cada clase inscrita
- ✅ Agregado `resolveClassFeeAndConfig()` para resolver tarifas por clase
- ✅ Actualizado `markPaymentAsReceived()` para incluir información de clase
- ✅ Actualizado `createRemainingPayment()` para incluir información de clase
- ✅ Actualizado `getAllPayments()` para incluir información de clase

### 3. APIs

#### Endpoints actualizados:
- ✅ `/api/admin/monthly-payments/all` - Incluye información de clase
- ✅ `/api/admin/send-pending-payment-whatsapp` - Incluye información de clase

### 4. Frontend

#### `PendingPaymentsDashboard`:
- ✅ Agregada columna "Clase" en la tabla
- ✅ Mostrar nombre de clase y deporte
- ✅ Actualizada interfaz `PendingPayment` para incluir información de clase

## Instrucciones de Migración

### Paso 1: Aplicar Migración de Base de Datos

```bash
# Generar cliente de Prisma
npx prisma generate

# Aplicar migración
npx prisma db push
```

### Paso 2: Migrar Datos Existentes

```bash
# Ejecutar script de migración
node scripts/migrate-payments-to-class-based.js
```

### Paso 3: Verificar Migración

1. Verificar que todos los pagos existentes se hayan migrado correctamente
2. Verificar que cada estudiante tenga un pago por cada clase inscrita
3. Verificar que los cortes de pago se hayan configurado correctamente

## Configuración de Cortes de Pago

### Para Estudiantes Existentes:
- Los cortes de pago se configuran por defecto en 30 días
- Se puede modificar individualmente por clase en la interfaz de administración

### Para Nuevos Estudiantes:
- Al inscribirse en una clase, se puede configurar el corte de pago específico
- Se puede configurar una mensualidad específica por clase si es necesario

## Beneficios de la Nueva Estructura

1. **Flexibilidad**: Cada clase puede tener su propio corte de pago
2. **Escalabilidad**: Soporte para estudiantes en múltiples clases
3. **Precisión**: Pagos específicos por clase en lugar de un pago global
4. **Mantenibilidad**: Estructura más clara y organizada

## Consideraciones Importantes

1. **Backup**: Siempre hacer backup antes de aplicar la migración
2. **Testing**: Probar en ambiente de desarrollo primero
3. **Rollback**: Tener plan de rollback en caso de problemas
4. **Monitoreo**: Monitorear el sistema después de la migración

## Archivos Modificados

- `prisma/schema.prisma`
- `lib/monthly-payment-service.ts`
- `components/monthly-payments/PendingPaymentsDashboard.tsx`
- `app/api/admin/monthly-payments/all/route.ts`
- `app/api/admin/send-pending-payment-whatsapp/route.ts`
- `scripts/migrate-payments-to-class-based.js` (nuevo)
- `prisma/migrations/20241220_add_class_based_payments/migration.sql` (nuevo)
