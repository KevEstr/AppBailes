# 💰 Sistema de Mensualidades - Academia de Baile

## 📋 Descripción General

Este sistema avanzado de mensualidades permite a la academia gestionar pagos unificados para todas las clases, donde cada estudiante paga una mensualidad fija sin importar la cantidad de clases a las que asista.

## 🏗️ Arquitectura del Sistema

### 🗄️ Tablas Principales

#### 1. `MonthlyFeeConfig` - Configuración de Mensualidades
```sql
-- Maneja el valor y configuración de las mensualidades
id, amount, description, isActive, validFrom, validUntil, createdBy
```
**Propósito**: Permite al admin establecer y cambiar el valor de la mensualidad con historial de cambios.

#### 2. `PaymentPeriod` - Períodos de Pago
```sql
-- Define los períodos mensuales (Enero 2024, Febrero 2024, etc.)
id, year, month, name, dueDate, isActive
```
**Propósito**: Organiza los pagos por períodos específicos con fechas límite.

#### 3. `MonthlyPayment` - Registro de Pagos Mensuales
```sql
-- Registro principal de cada pago mensual por estudiante
id, studentId, periodId, feeConfigId, expectedAmount, paidAmount, 
status, paymentDate, approvedBy, notes
```
**Propósito**: Núcleo del sistema, registra el estado de cada pago mensual.

#### 4. `PaymentForm` - Formularios de Pago
```sql
-- Formularios únicos generados para cada estudiante/período
id (CUID), studentId, periodId, monthlyPaymentId, studentName, 
amount, status, expiresAt, usedAt
```
**Propósito**: Genera URLs únicas para que cada estudiante tenga su formulario de pago.

#### 5. `PaymentProof` - Comprobantes de Pago
```sql
-- Comprobantes subidos por los pagadores
id, formId, payerName, payerPhone, payerEmail, amount, paymentMethod,
proofImageUrl, status, reviewedAt, reviewedBy, reviewNotes
```
**Propósito**: Almacena los comprobantes de pago subidos para revisión del admin.

## 🔄 Flujo de Trabajo

### 1. **Configuración Inicial** (Admin)
```typescript
// El admin establece el valor mensual
await prisma.monthlyFeeConfig.create({
  data: {
    amount: 150000, // $150,000 COP
    description: "Mensualidad 2024 - Todas las clases",
    isActive: true,
    validFrom: new Date(),
    createdBy: "admin@academia.com"
  }
})
```

### 2. **Creación de Períodos** (Admin)
```typescript
// Crear período mensual
await prisma.paymentPeriod.create({
  data: {
    year: 2024,
    month: 1,
    name: "Enero 2024",
    dueDate: new Date("2024-01-31"),
    isActive: true
  }
})
```

### 3. **Generación de Pagos Mensuales** (Sistema)
```typescript
// Para cada estudiante activo, crear registro de pago mensual
for (const student of activeStudents) {
  await prisma.monthlyPayment.create({
    data: {
      studentId: student.id,
      periodId: period.id,
      feeConfigId: currentFeeConfig.id,
      expectedAmount: currentFeeConfig.amount,
      status: "PENDING"
    }
  })
}
```

### 4. **Generación de Formularios** (Sistema)
```typescript
// Generar formulario único para cada estudiante
const paymentForm = await prisma.paymentForm.create({
  data: {
    id: generateUniqueId(), // CUID
    studentId: student.id,
    periodId: period.id,
    monthlyPaymentId: monthlyPayment.id,
    studentName: student.name,
    amount: expectedAmount,
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
  }
})

// URL del formulario: https://academia.com/payment/[formId]
```

### 5. **Proceso de Pago** (Estudiante/Pagador)
```typescript
// El pagador accede al formulario y sube comprobante
await prisma.paymentProof.create({
  data: {
    formId: form.id,
    payerName: "Juan Pérez",
    payerPhone: "+57 300 123 4567",
    amount: 150000,
    paymentMethod: "TRANSFER",
    proofImageUrl: "/uploads/proof_123.jpg",
    status: "PENDING"
  }
})

// Actualizar estado del pago mensual
await prisma.monthlyPayment.update({
  where: { id: monthlyPayment.id },
  data: { status: "PENDING_REVIEW" }
})
```

### 6. **Revisión y Aprobación** (Admin)
```typescript
// Admin revisa y aprueba/rechaza
await prisma.paymentProof.update({
  where: { id: proofId },
  data: {
    status: "APPROVED",
    reviewedAt: new Date(),
    reviewedBy: "admin@academia.com",
    reviewNotes: "Comprobante válido, pago completo"
  }
})

// Actualizar pago mensual
await prisma.monthlyPayment.update({
  where: { id: monthlyPayment.id },
  data: {
    status: "PAID",
    paidAmount: proof.amount,
    paymentDate: new Date(),
    approvedBy: "admin@academia.com"
  }
})
```

## 📊 Estados del Sistema

### Estados de `MonthlyPayment`
- **PENDING**: Pendiente de pago
- **PARTIAL_PAID**: Pago parcial recibido
- **PAID**: Pagado completamente
- **OVERDUE**: Vencido (pasó la fecha límite)
- **CANCELLED**: Cancelado por el admin
- **PENDING_REVIEW**: Con comprobante subido, esperando revisión

### Estados de `PaymentForm`
- **ACTIVE**: Activo y disponible
- **USED**: Ya utilizado para subir comprobante
- **EXPIRED**: Expirado
- **CANCELLED**: Cancelado por admin

### Estados de `PaymentProof`
- **PENDING**: Pendiente de revisión
- **APPROVED**: Aprobado
- **REJECTED**: Rechazado
- **NEEDS_REVIEW**: Necesita revisión adicional

## 🛠️ APIs a Implementar

### 1. **Configuración de Mensualidades**
```typescript
// POST /api/admin/monthly-fee
// GET /api/admin/monthly-fee/current
// PUT /api/admin/monthly-fee/:id
```

### 2. **Gestión de Períodos**
```typescript
// POST /api/admin/payment-periods
// GET /api/admin/payment-periods
// PUT /api/admin/payment-periods/:id
```

### 3. **Formularios de Pago**
```typescript
// POST /api/admin/generate-payment-forms/:periodId
// GET /api/payment-form/:formId (público)
// POST /api/payment-form/:formId/upload-proof (público)
```

### 4. **Dashboard de Admin**
```typescript
// GET /api/admin/payment-dashboard
// GET /api/admin/payment-proofs/pending
// PUT /api/admin/payment-proofs/:id/review
```

### 5. **Reportes**
```typescript
// GET /api/admin/reports/monthly-payments/:periodId
// GET /api/admin/reports/payment-status
// GET /api/admin/reports/outstanding-payments
```

## 🔒 Seguridad y Validaciones

### Validaciones de Formularios
- **Formulario único**: Cada estudiante tiene un formulario único por período
- **Expiración**: Los formularios tienen fecha de expiración
- **Uso único**: Un formulario solo puede usarse una vez
- **Validación de imágenes**: Solo se permiten formatos específicos (JPG, PNG, PDF)

### Seguridad de URLs
- **CUID**: IDs únicos y seguros para formularios
- **Validación de estado**: Solo formularios ACTIVE pueden recibir comprobantes
- **Rate limiting**: Limitar subida de comprobantes por IP

## 📱 Funcionalidades del Admin

### Dashboard Principal
```typescript
interface PaymentDashboard {
  totalStudents: number;
  totalExpected: number;
  totalCollected: number;
  pendingReview: number;
  overdue: number;
  collectionRate: number;
  monthlyStats: MonthlyStats[];
}
```

### Acciones del Admin
1. **Configurar mensualidad**: Establecer valor y vigencia
2. **Crear períodos**: Definir meses y fechas límite
3. **Generar formularios**: Crear formularios masivos para todos los estudiantes
4. **Revisar comprobantes**: Aprobar/rechazar comprobantes
5. **Gestionar deudas**: Marcar estudiantes con deudas pendientes
6. **Reportes**: Generar reportes de pagos y estadísticas

## 🚀 Próximos Pasos

### Fase 1: Implementación Básica
- [ ] Crear APIs de configuración
- [ ] Implementar formularios de pago
- [ ] Sistema de subida de imágenes
- [ ] Dashboard básico de admin

### Fase 2: Funcionalidades Avanzadas
- [ ] Notificaciones automáticas
- [ ] Recordatorios de pago
- [ ] Integración con WhatsApp
- [ ] Reportes avanzados

### Fase 3: Optimizaciones
- [ ] Caching de consultas frecuentes
- [ ] Optimización de imágenes
- [ ] Backup automático de comprobantes
- [ ] Auditoría de cambios

## 🔧 Comandos Útiles

```bash
# Generar cliente Prisma con nuevas tablas
npx prisma generate

# Crear migración
npx prisma migrate dev --name add-monthly-payment-system

# Resetear base de datos (desarrollo)
npx prisma migrate reset

# Ver estado de la base de datos
npx prisma db pull
```

## 📝 Notas Importantes

1. **Backward Compatibility**: El sistema mantiene compatibilidad con las tablas existentes (`Receipt`, `Debt`)
2. **Escalabilidad**: Diseñado para manejar múltiples períodos y cambios de precios
3. **Auditoría**: Cada acción del admin se registra con timestamps y usuario
4. **Flexibilidad**: Permite pagos parciales y múltiples comprobantes por formulario
5. **Seguridad**: URLs únicas y validaciones robustas 