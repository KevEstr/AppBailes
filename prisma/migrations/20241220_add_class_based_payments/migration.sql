-- CreateEnum
CREATE TYPE "SportType_new" AS ENUM ('DANCE', 'VOLLEYBALL');
ALTER TABLE "monthly_fee_configs" ALTER COLUMN "sport" TYPE "SportType_new" USING ("sport"::text::"SportType_new");
DROP TYPE "SportType";
ALTER TYPE "SportType_new" RENAME TO "SportType";

-- AlterTable
ALTER TABLE "class_enrollments" ADD COLUMN     "monthlyFee" DOUBLE PRECISION,
ADD COLUMN     "paymentCutoffDay" INTEGER DEFAULT 30;

-- AlterTable
ALTER TABLE "monthly_payments" ADD COLUMN     "classId" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "student_enrollment_data" DROP COLUMN "paymentCutoffDay";

-- AddForeignKey
ALTER TABLE "monthly_payments" ADD CONSTRAINT "monthly_payments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "monthly_payments_classId_idx" ON "monthly_payments"("classId");

-- CreateIndex
CREATE INDEX "monthly_payments_periodId_idx" ON "monthly_payments"("periodId");

-- CreateIndex
CREATE INDEX "monthly_payments_status_idx" ON "monthly_payments"("status");

-- CreateIndex
CREATE INDEX "class_enrollments_paymentCutoffDay_idx" ON "class_enrollments"("paymentCutoffDay");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_payments_studentId_classId_periodId_key" ON "monthly_payments"("studentId", "classId", "periodId");
