-- AlterTable
ALTER TABLE "monthly_payments" ADD COLUMN "reminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reminderSentAt" TIMESTAMPTZ,
ADD COLUMN "receiptSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "receiptSentAt" TIMESTAMPTZ;

