-- Script para convertir todas las columnas DateTime a TIMESTAMPTZ en PostgreSQL
-- Esto almacenará las fechas con zona horaria de Colombia

-- IMPORTANTE: Hacer backup antes de ejecutar este script
-- Este script convierte todas las columnas TIMESTAMP a TIMESTAMPTZ

BEGIN;

-- Configurar zona horaria para la sesión
SET timezone = 'America/Bogota';

-- ==============================================================
-- ELIMINAR VISTAS QUE DEPENDEN DE LAS COLUMNAS
-- ==============================================================

-- Guardar la definición de la vista para recrearla después
-- Eliminar la vista que causa conflicto
DROP VIEW IF EXISTS financial_transactions_view CASCADE;

-- ==============================================================
-- STUDENTS TABLE
-- ==============================================================
ALTER TABLE students 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- STUDENT_ENROLLMENT_DATA TABLE
-- ==============================================================
ALTER TABLE student_enrollment_data
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- CLASSES TABLE
-- ==============================================================
ALTER TABLE classes
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- SPORT_LOCATIONS TABLE
-- ==============================================================
ALTER TABLE sport_locations
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- CLASS_SCHEDULES TABLE
-- ==============================================================
ALTER TABLE class_schedules
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- CLASS_SESSIONS TABLE
-- ==============================================================
ALTER TABLE class_sessions
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "startTime" TYPE TIMESTAMPTZ USING "startTime" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "endTime" TYPE TIMESTAMPTZ USING "endTime" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- CLASS_ENROLLMENTS TABLE
-- ==============================================================
ALTER TABLE class_enrollments
  ALTER COLUMN "enrolledAt" TYPE TIMESTAMPTZ USING "enrolledAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- STUDENT_TRANSFERS TABLE
-- ==============================================================
ALTER TABLE student_transfers
  ALTER COLUMN "transferredAt" TYPE TIMESTAMPTZ USING "transferredAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- ATTENDANCES TABLE
-- ==============================================================
ALTER TABLE attendances
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- RECEIPTS TABLE
-- ==============================================================
ALTER TABLE receipts
  ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ USING "sentAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- DEBTS TABLE
-- ==============================================================
ALTER TABLE debts
  ALTER COLUMN "dueDate" TYPE TIMESTAMPTZ USING "dueDate" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "paidAt" TYPE TIMESTAMPTZ USING "paidAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "lastReminder" TYPE TIMESTAMPTZ USING "lastReminder" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- MASSIVE_MESSAGES TABLE
-- ==============================================================
ALTER TABLE massive_messages
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- TRAINERS TABLE
-- ==============================================================
ALTER TABLE trainers
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- TRAINER_ATTENDANCES TABLE
-- ==============================================================
ALTER TABLE trainer_attendances
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- MONTHLY_FEE_CONFIGS TABLE
-- ==============================================================
ALTER TABLE monthly_fee_configs
  ALTER COLUMN "validFrom" TYPE TIMESTAMPTZ USING "validFrom" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "validUntil" TYPE TIMESTAMPTZ USING "validUntil" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- PAYMENT_PERIODS TABLE
-- ==============================================================
ALTER TABLE payment_periods
  ALTER COLUMN "dueDate" TYPE TIMESTAMPTZ USING "dueDate" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- MONTHLY_PAYMENTS TABLE
-- ==============================================================
ALTER TABLE monthly_payments
  ALTER COLUMN "paymentDate" TYPE TIMESTAMPTZ USING "paymentDate" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- PAYMENT_FORMS TABLE
-- ==============================================================
ALTER TABLE payment_forms
  ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ USING "expiresAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "usedAt" TYPE TIMESTAMPTZ USING "usedAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- PAYMENT_PROOFS TABLE
-- ==============================================================
ALTER TABLE payment_proofs
  ALTER COLUMN "uploadedAt" TYPE TIMESTAMPTZ USING "uploadedAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "reviewedAt" TYPE TIMESTAMPTZ USING "reviewedAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- ENROLLMENT_PAYMENTS TABLE
-- ==============================================================
ALTER TABLE enrollment_payments
  ALTER COLUMN "paidAt" TYPE TIMESTAMPTZ USING "paidAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- ENROLLMENT_PAYMENT_FORMS TABLE
-- ==============================================================
ALTER TABLE enrollment_payment_forms
  ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ USING "expiresAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "usedAt" TYPE TIMESTAMPTZ USING "usedAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- ENROLLMENT_PAYMENT_PROOFS TABLE
-- ==============================================================
ALTER TABLE enrollment_payment_proofs
  ALTER COLUMN "uploadedAt" TYPE TIMESTAMPTZ USING "uploadedAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "reviewedAt" TYPE TIMESTAMPTZ USING "reviewedAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- SCHEDULED_WHATSAPP_SENDS TABLE
-- ==============================================================
ALTER TABLE scheduled_whatsapp_sends
  ALTER COLUMN "scheduledFor" TYPE TIMESTAMPTZ USING "scheduledFor" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "scheduledDate" TYPE TIMESTAMPTZ USING "scheduledDate" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ USING "sentAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- PAYMENT_SCHEDULERS TABLE
-- ==============================================================
ALTER TABLE payment_schedulers
  ALTER COLUMN "lastExecuted" TYPE TIMESTAMPTZ USING "lastExecuted" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "nextExecution" TYPE TIMESTAMPTZ USING "nextExecution" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- SCHEDULER_RECIPIENTS TABLE
-- ==============================================================
ALTER TABLE scheduler_recipients
  ALTER COLUMN "lastSent" TYPE TIMESTAMPTZ USING "lastSent" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "addedAt" TYPE TIMESTAMPTZ USING "addedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- SCHEDULER_EXECUTIONS TABLE
-- ==============================================================
ALTER TABLE scheduler_executions
  ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ USING "startedAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ USING "completedAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- USERS TABLE
-- ==============================================================
ALTER TABLE users
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- SERVICES TABLE
-- ==============================================================
ALTER TABLE services
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- SERVICE_RATES TABLE
-- ==============================================================
ALTER TABLE service_rates
  ALTER COLUMN "validFrom" TYPE TIMESTAMPTZ USING "validFrom" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "validUntil" TYPE TIMESTAMPTZ USING "validUntil" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- SERVICE_ORDERS TABLE
-- ==============================================================
ALTER TABLE service_orders
  ALTER COLUMN "scheduledDate" TYPE TIMESTAMPTZ USING "scheduledDate" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "completedDate" TYPE TIMESTAMPTZ USING "completedDate" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- SERVICE_PAYMENTS TABLE
-- ==============================================================
ALTER TABLE service_payments
  ALTER COLUMN "paymentDate" TYPE TIMESTAMPTZ USING "paymentDate" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- FINANCIAL_PERIODS TABLE
-- ==============================================================
ALTER TABLE financial_periods
  ALTER COLUMN "startDate" TYPE TIMESTAMPTZ USING "startDate" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "endDate" TYPE TIMESTAMPTZ USING "endDate" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "closedAt" TYPE TIMESTAMPTZ USING "closedAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- FINANCIAL_TRANSACTIONS TABLE
-- ==============================================================
ALTER TABLE financial_transactions
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

-- ==============================================================
-- FINANCIAL_REPORTS TABLE
-- ==============================================================
ALTER TABLE financial_reports
  ALTER COLUMN "generatedAt" TYPE TIMESTAMPTZ USING "generatedAt" AT TIME ZONE 'America/Bogota';

COMMIT;

-- ==============================================================
-- VERIFICACIÓN FINAL
-- ==============================================================

-- Verificar que las columnas se convirtieron correctamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND data_type = 'timestamp with time zone'
ORDER BY table_name, column_name;

-- Verificar zona horaria actual
SELECT current_setting('timezone') as current_timezone;

-- Verificar que NOW() devuelve timestamp con zona horaria
SELECT NOW() as current_time_with_timezone;

-- ==============================================================
-- RECREAR LA VISTA FINANCIAL_TRANSACTIONS_VIEW
-- ==============================================================

CREATE OR REPLACE VIEW financial_transactions_view AS
SELECT 
    'RECEIPT' as source_table,
    id::text as transaction_id,
    amount,
    concept as description,
    'INCOME' as transaction_type,
    'RECEIPT' as category,
    "createdAt" as transaction_date,
    CASE 
      WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    "studentId" as student_id,
    NULL::text as period_id,
    NULL::text as related_id,
    NULL::text as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM receipts
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'DEBT' as source_table,
    id::text as transaction_id,
    amount,
    concept as description,
    'PENDING_LIABILITY' as transaction_type,
    'DEBT' as category,
    "createdAt" as transaction_date,
    NULL as payment_method,
    "studentId" as student_id,
    NULL::text as period_id,
    NULL::text as related_id,
    NULL::text as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM debts
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'MONTHLY_PAYMENT' as source_table,
    id::text as transaction_id,
    "expectedAmount" as amount,
    CONCAT('Mensualidad - ', COALESCE(notes, 'Sin descripción')) as description,
    CASE 
      WHEN status = 'PAID' THEN 'INCOME'
      WHEN status = 'PARTIAL_PAID' THEN 'INCOME'
      WHEN status = 'PENDING' THEN 'PENDING_LIABILITY'
      WHEN status = 'OVERDUE' THEN 'PENDING_LIABILITY'
      WHEN status = 'CANCELLED' THEN 'CANCELLED'
      WHEN status = 'PENDING_REVIEW' THEN 'PENDING_REVIEW'
      ELSE 'PENDING_LIABILITY'
    END as transaction_type,
    'MONTHLY_PAYMENT' as category,
    COALESCE("paymentDate", "createdAt") as transaction_date,
    NULL as payment_method,
    "studentId" as student_id,
    "periodId"::text as period_id,
    NULL::text as related_id,
    'MONTHLY_PAYMENT' as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM monthly_payments
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'PAYMENT_PROOF' as source_table,
    id::text as transaction_id,
    amount,
    CONCAT('Comprobante de pago - ', "payerName") as description,
    CASE 
      WHEN status = 'APPROVED' THEN 'INCOME'
      WHEN status = 'PENDING' THEN 'PENDING_REVIEW'
      WHEN status = 'REJECTED' THEN 'REJECTED'
      WHEN status = 'NEEDS_REVIEW' THEN 'PENDING_REVIEW'
      ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'PAYMENT_PROOF' as category,
    "uploadedAt" as transaction_date,
    CASE 
      WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    NULL as student_id,
    NULL::text as period_id,
    "formId" as related_id,
    'PAYMENT_PROOF' as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM payment_proofs
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'ENROLLMENT_PAYMENT' as source_table,
    id::text as transaction_id,
    "expectedAmount" as amount,
    CONCAT('Inscripción ', sport::text) as description,
    CASE 
      WHEN status = 'PAID' THEN 'INCOME'
      WHEN status = 'PENDING' THEN 'PENDING_LIABILITY'
      WHEN status = 'CANCELLED' THEN 'CANCELLED'
      WHEN status = 'PENDING_REVIEW' THEN 'PENDING_REVIEW'
      ELSE 'PENDING_LIABILITY'
    END as transaction_type,
    'ENROLLMENT_PAYMENT' as category,
    COALESCE("paidAt", "createdAt") as transaction_date,
    NULL as payment_method,
    "studentId" as student_id,
    NULL::text as period_id,
    NULL::text as related_id,
    'ENROLLMENT_PAYMENT' as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM enrollment_payments
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'ENROLLMENT_PAYMENT_PROOF' as source_table,
    id::text as transaction_id,
    amount,
    CONCAT('Comprobante inscripción - ', "payerName") as description,
    CASE 
      WHEN status = 'APPROVED' THEN 'INCOME'
      WHEN status = 'PENDING' THEN 'PENDING_REVIEW'
      WHEN status = 'REJECTED' THEN 'REJECTED'
      WHEN status = 'NEEDS_REVIEW' THEN 'PENDING_REVIEW'
      ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'ENROLLMENT_PAYMENT_PROOF' as category,
    "uploadedAt" as transaction_date,
    CASE 
      WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    NULL as student_id,
    NULL::text as period_id,
    "enrollmentPaymentFormId" as related_id,
    'ENROLLMENT_PAYMENT_PROOF' as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM enrollment_payment_proofs
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'SERVICE_PAYMENT' as source_table,
    id::text as transaction_id,
    amount,
    CONCAT('Pago de servicio - ', COALESCE(reference, 'Sin referencia')) as description,
    CASE 
      WHEN status = 'PAID' THEN 'INCOME'
      WHEN status = 'PENDING' THEN 'PENDING_LIABILITY'
      WHEN status = 'PARTIAL' THEN 'INCOME'
      WHEN status = 'FAILED' THEN 'FAILED'
      WHEN status = 'REFUNDED' THEN 'EXPENSE'
      ELSE 'PENDING_LIABILITY'
    END as transaction_type,
    'SERVICE_PAYMENT' as category,
    COALESCE("paymentDate", "createdAt") as transaction_date,
    CASE 
      WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    NULL as student_id,
    NULL::text as period_id,
    "orderId"::text as related_id,
    'SERVICE_PAYMENT' as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM service_payments
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'FINANCIAL_TRANSACTION' as source_table,
    id::text as transaction_id,
    amount,
    description,
    type::text as transaction_type,
    category::text as category,
    date as transaction_date,
    CASE 
      WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    "studentId" as student_id,
    "periodId"::text as period_id,
    "relatedId"::text as related_id,
    "relatedType" as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM financial_transactions
WHERE "createdAt" IS NOT NULL;

-- ✅ Conversión completada - Todas las fechas ahora se almacenan con zona horaria de Colombia
SELECT '✅ Todas las columnas DateTime convertidas a TIMESTAMPTZ con zona horaria de Colombia' as status;
SELECT '✅ Vista financial_transactions_view recreada correctamente' as view_status;