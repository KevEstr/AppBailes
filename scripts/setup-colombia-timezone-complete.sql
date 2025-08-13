-- Script completo para configurar zona horaria de Colombia en PostgreSQL
-- Actualiza todas las columnas DateTime del schema de AppBailes
-- Ejecutar este script con privilegios de administrador de base de datos

-- ==============================================================
-- 1. CONFIGURACIÓN GLOBAL DE ZONA HORARIA
-- ==============================================================

-- Configurar zona horaria para la sesión actual
SET timezone = 'America/Bogota';

-- Configurar zona horaria por defecto para la base de datos
-- Reemplazar 'your_database_name' con el nombre real de tu base de datos
-- ALTER DATABASE your_database_name SET timezone TO 'America/Bogota';

-- Verificar configuración actual
SELECT current_setting('timezone') as current_timezone;

-- Mostrar información de zona horaria
SELECT 
    NOW() as utc_time,
    NOW() AT TIME ZONE 'America/Bogota' as colombia_time,
    EXTRACT(TIMEZONE FROM NOW()) as timezone_offset_seconds;

-- ==============================================================
-- 2. FUNCIONES UTILITARIAS PARA ZONA HORARIA
-- ==============================================================

-- Función para obtener fecha actual en zona horaria de Colombia
CREATE OR REPLACE FUNCTION now_colombia()
RETURNS timestamp with time zone AS $$
BEGIN
    RETURN NOW() AT TIME ZONE 'America/Bogota';
END;
$$ LANGUAGE plpgsql;

-- Función para convertir timestamp a zona horaria de Colombia
CREATE OR REPLACE FUNCTION to_colombia_timezone(input_timestamp timestamp)
RETURNS timestamp with time zone AS $$
BEGIN
    RETURN input_timestamp AT TIME ZONE 'America/Bogota';
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- 3. CONVERSIÓN DE DATOS EXISTENTES A ZONA HORARIA DE COLOMBIA
-- ==============================================================

-- IMPORTANTE: Las siguientes operaciones modifican datos existentes
-- Ejecutar con precaución y hacer backup antes

BEGIN;

-- Students table
UPDATE students SET 
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Student enrollment data
UPDATE student_enrollment_data SET 
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Classes
UPDATE classes SET 
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Sport locations
UPDATE sport_locations SET 
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Class schedules
UPDATE class_schedules SET 
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Class sessions (incluye date, startTime, endTime)
UPDATE class_sessions SET 
    date = date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "startTime" = "startTime" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "endTime" = "endTime" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE date IS NOT NULL OR "startTime" IS NOT NULL OR "endTime" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Class enrollments (incluye enrolledAt)
UPDATE class_enrollments SET 
    "enrolledAt" = "enrolledAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "enrolledAt" IS NOT NULL OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Student transfers (incluye transferredAt)
UPDATE student_transfers SET 
    "transferredAt" = "transferredAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "transferredAt" IS NOT NULL;

-- Attendances (incluye date)
UPDATE attendances SET 
    date = date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE date IS NOT NULL OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Receipts (incluye sentAt)
UPDATE receipts SET 
    "sentAt" = "sentAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "sentAt" IS NOT NULL OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Debts (incluye dueDate, paidAt, lastReminder)
UPDATE debts SET 
    "dueDate" = "dueDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "paidAt" = "paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "lastReminder" = "lastReminder" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "dueDate" IS NOT NULL OR "paidAt" IS NOT NULL OR "lastReminder" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Massive messages
UPDATE massive_messages SET 
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Trainers
UPDATE trainers SET 
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Trainer attendances (incluye date)
UPDATE trainer_attendances SET 
    date = date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE date IS NOT NULL OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Monthly fee configs (incluye validFrom, validUntil)
UPDATE monthly_fee_configs SET 
    "validFrom" = "validFrom" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "validUntil" = "validUntil" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "validFrom" IS NOT NULL OR "validUntil" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Payment periods (incluye dueDate)
UPDATE payment_periods SET 
    "dueDate" = "dueDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "dueDate" IS NOT NULL OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Monthly payments (incluye paymentDate)
UPDATE monthly_payments SET 
    "paymentDate" = "paymentDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "paymentDate" IS NOT NULL OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Payment forms (incluye expiresAt, usedAt)
UPDATE payment_forms SET 
    "expiresAt" = "expiresAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "usedAt" = "usedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "expiresAt" IS NOT NULL OR "usedAt" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Payment proofs (incluye uploadedAt, reviewedAt)
UPDATE payment_proofs SET 
    "uploadedAt" = "uploadedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "reviewedAt" = "reviewedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "uploadedAt" IS NOT NULL OR "reviewedAt" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Enrollment payments (incluye paidAt)
UPDATE enrollment_payments SET 
    "paidAt" = "paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "paidAt" IS NOT NULL OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Enrollment payment forms (incluye expiresAt, usedAt)
UPDATE enrollment_payment_forms SET 
    "expiresAt" = "expiresAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "usedAt" = "usedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "expiresAt" IS NOT NULL OR "usedAt" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Enrollment payment proofs (incluye uploadedAt, reviewedAt)
UPDATE enrollment_payment_proofs SET 
    "uploadedAt" = "uploadedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "reviewedAt" = "reviewedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "uploadedAt" IS NOT NULL OR "reviewedAt" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Scheduled WhatsApp sends (incluye scheduledFor, scheduledDate, sentAt)
UPDATE scheduled_whatsapp_sends SET 
    "scheduledFor" = "scheduledFor" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "scheduledDate" = "scheduledDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "sentAt" = "sentAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "scheduledFor" IS NOT NULL OR "scheduledDate" IS NOT NULL OR "sentAt" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Payment schedulers (incluye lastExecuted, nextExecution)
UPDATE payment_schedulers SET 
    "lastExecuted" = "lastExecuted" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "nextExecution" = "nextExecution" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "lastExecuted" IS NOT NULL OR "nextExecution" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Scheduler recipients (incluye lastSent, addedAt)
UPDATE scheduler_recipients SET 
    "lastSent" = "lastSent" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "addedAt" = "addedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "lastSent" IS NOT NULL OR "addedAt" IS NOT NULL;

-- Scheduler executions (incluye startedAt, completedAt)
UPDATE scheduler_executions SET 
    "startedAt" = "startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "completedAt" = "completedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "startedAt" IS NOT NULL OR "completedAt" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Users
UPDATE users SET 
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Services
UPDATE services SET 
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Service rates (incluye validFrom, validUntil)
UPDATE service_rates SET 
    "validFrom" = "validFrom" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "validUntil" = "validUntil" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "validFrom" IS NOT NULL OR "validUntil" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Service orders (incluye scheduledDate, completedDate)
UPDATE service_orders SET 
    "scheduledDate" = "scheduledDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "completedDate" = "completedDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "scheduledDate" IS NOT NULL OR "completedDate" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Service payments (incluye paymentDate)
UPDATE service_payments SET 
    "paymentDate" = "paymentDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "paymentDate" IS NOT NULL OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Financial periods (incluye startDate, endDate, closedAt)
UPDATE financial_periods SET 
    "startDate" = "startDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "endDate" = "endDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "closedAt" = "closedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "startDate" IS NOT NULL OR "endDate" IS NOT NULL OR "closedAt" IS NOT NULL 
   OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Financial transactions (incluye date)
UPDATE financial_transactions SET 
    date = date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "createdAt" = "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota',
    "updatedAt" = "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE date IS NOT NULL OR "createdAt" IS NOT NULL OR "updatedAt" IS NOT NULL;

-- Financial reports (incluye generatedAt)
UPDATE financial_reports SET 
    "generatedAt" = "generatedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'
WHERE "generatedAt" IS NOT NULL;

COMMIT;

-- ==============================================================
-- 4. VERIFICACIÓN FINAL
-- ==============================================================

-- Verificar que la configuración se aplicó correctamente
SELECT 
    'timezone_check' as test_name,
    current_setting('timezone') as current_timezone,
    NOW() as current_time,
    NOW() AT TIME ZONE 'America/Bogota' as colombia_time;

-- Verificar algunas tablas clave con datos actualizados
SELECT 
    'sample_data_check' as test_name,
    COUNT(*) as total_students,
    MIN("createdAt") as oldest_student_created,
    MAX("createdAt") as newest_student_created
FROM students
WHERE "createdAt" IS NOT NULL;

-- Mostrar función de utilidad creada
SELECT 
    'utility_functions' as test_name,
    now_colombia() as current_colombia_time;

-- Finalizado
SELECT '✅ Configuración de zona horaria de Colombia aplicada exitosamente' as status;