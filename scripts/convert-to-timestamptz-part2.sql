-- Parte 2: Continuar conversión de tablas restantes

-- RECEIPTS TABLE
ALTER TABLE receipts
  ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ USING "sentAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'receipts.sentAt convertido' as status;

ALTER TABLE receipts
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'receipts.createdAt convertido' as status;

ALTER TABLE receipts
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'receipts.updatedAt convertido' as status;

-- DEBTS TABLE
ALTER TABLE debts
  ALTER COLUMN "dueDate" TYPE TIMESTAMPTZ USING "dueDate" AT TIME ZONE 'America/Bogota';
  
SELECT 'debts.dueDate convertido' as status;

ALTER TABLE debts
  ALTER COLUMN "paidAt" TYPE TIMESTAMPTZ USING "paidAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'debts.paidAt convertido' as status;

ALTER TABLE debts
  ALTER COLUMN "lastReminder" TYPE TIMESTAMPTZ USING "lastReminder" AT TIME ZONE 'America/Bogota';
  
SELECT 'debts.lastReminder convertido' as status;

ALTER TABLE debts
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'debts.createdAt convertido' as status;

ALTER TABLE debts
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'debts.updatedAt convertido' as status;

-- MASSIVE_MESSAGES TABLE
ALTER TABLE massive_messages
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'massive_messages.createdAt convertido' as status;

ALTER TABLE massive_messages
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'massive_messages.updatedAt convertido' as status;

-- TRAINERS TABLE
ALTER TABLE trainers
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'trainers.createdAt convertido' as status;

ALTER TABLE trainers
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'trainers.updatedAt convertido' as status;

-- TRAINER_ATTENDANCES TABLE
ALTER TABLE trainer_attendances
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date AT TIME ZONE 'America/Bogota';
  
SELECT 'trainer_attendances.date convertido' as status;

ALTER TABLE trainer_attendances
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'trainer_attendances.createdAt convertido' as status;

ALTER TABLE trainer_attendances
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'trainer_attendances.updatedAt convertido' as status;

-- MONTHLY_FEE_CONFIGS TABLE
ALTER TABLE monthly_fee_configs
  ALTER COLUMN "validFrom" TYPE TIMESTAMPTZ USING "validFrom" AT TIME ZONE 'America/Bogota';
  
SELECT 'monthly_fee_configs.validFrom convertido' as status;

ALTER TABLE monthly_fee_configs
  ALTER COLUMN "validUntil" TYPE TIMESTAMPTZ USING "validUntil" AT TIME ZONE 'America/Bogota';
  
SELECT 'monthly_fee_configs.validUntil convertido' as status;

ALTER TABLE monthly_fee_configs
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'monthly_fee_configs.createdAt convertido' as status;

ALTER TABLE monthly_fee_configs
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'monthly_fee_configs.updatedAt convertido' as status;

-- PAYMENT_PERIODS TABLE
ALTER TABLE payment_periods
  ALTER COLUMN "dueDate" TYPE TIMESTAMPTZ USING "dueDate" AT TIME ZONE 'America/Bogota';
  
SELECT 'payment_periods.dueDate convertido' as status;

ALTER TABLE payment_periods
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'payment_periods.createdAt convertido' as status;

ALTER TABLE payment_periods
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'America/Bogota';
  
SELECT 'payment_periods.updatedAt convertido' as status;