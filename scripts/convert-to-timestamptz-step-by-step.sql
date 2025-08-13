-- Script para convertir columnas DateTime a TIMESTAMPTZ paso a paso
-- Ejecutar comando por comando para identificar problemas

-- Configurar zona horaria para la sesión
SET timezone = 'America/Bogota';

-- Verificar zona horaria actual
SELECT current_setting('timezone') as current_timezone;

-- Eliminar la vista que causa conflicto
DROP VIEW IF EXISTS financial_transactions_view CASCADE;

-- Verificar que la vista fue eliminada
SELECT 'Vista eliminada correctamente' as status;

-- ==============================================================
-- CONVERTIR TABLAS UNA POR UNA (SIN TRANSACCIÓN)
-- ==============================================================

-- STUDENTS TABLE
ALTER TABLE students 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'students.createdAt convertido' as status;

ALTER TABLE students
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'students.updatedAt convertido' as status;

-- STUDENT_ENROLLMENT_DATA TABLE
ALTER TABLE student_enrollment_data
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'student_enrollment_data.createdAt convertido' as status;

ALTER TABLE student_enrollment_data
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'student_enrollment_data.updatedAt convertido' as status;

-- CLASSES TABLE
ALTER TABLE classes
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'classes.createdAt convertido' as status;

ALTER TABLE classes
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'classes.updatedAt convertido' as status;

-- SPORT_LOCATIONS TABLE
ALTER TABLE sport_locations
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'sport_locations.createdAt convertido' as status;

ALTER TABLE sport_locations
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'sport_locations.updatedAt convertido' as status;

-- CLASS_SCHEDULES TABLE
ALTER TABLE class_schedules
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'class_schedules.createdAt convertido' as status;

ALTER TABLE class_schedules
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'class_schedules.updatedAt convertido' as status;

-- CLASS_SESSIONS TABLE
ALTER TABLE class_sessions
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date AT TIME ZONE 'America/Bogota';
  
SELECT 'class_sessions.date convertido' as status;

ALTER TABLE class_sessions
  ALTER COLUMN "startTime" TYPE TIMESTAMPTZ USING "startTime" AT TIME ZONE 'America/Bogota';
  
SELECT 'class_sessions.startTime convertido' as status;

ALTER TABLE class_sessions
  ALTER COLUMN "endTime" TYPE TIMESTAMPTZ USING "endTime" AT TIME ZONE 'America/Bogota';
  
SELECT 'class_sessions.endTime convertido' as status;

ALTER TABLE class_sessions
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'class_sessions.createdAt convertido' as status;

ALTER TABLE class_sessions
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'class_sessions.updatedAt convertido' as status;

-- CLASS_ENROLLMENTS TABLE
ALTER TABLE class_enrollments
  ALTER COLUMN "enrolledAt" TYPE TIMESTAMPTZ USING "enrolledAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'class_enrollments.enrolledAt convertido' as status;

ALTER TABLE class_enrollments
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'class_enrollments.createdAt convertido' as status;

ALTER TABLE class_enrollments
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'class_enrollments.updatedAt convertido' as status;

-- STUDENT_TRANSFERS TABLE
ALTER TABLE student_transfers
  ALTER COLUMN "transferredAt" TYPE TIMESTAMPTZ USING "transferredAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'student_transfers.transferredAt convertido' as status;

-- ATTENDANCES TABLE
ALTER TABLE attendances
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date AT TIME ZONE 'America/Bogota';
  
SELECT 'attendances.date convertido' as status;

ALTER TABLE attendances
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'attendances.createdAt convertido' as status;

ALTER TABLE enrollment_payments
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
ALTER TABLE enrollment_payments
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';

ALTER TABLE attendances
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
    
SELECT 'attendances.updatedAt convertido' as status;