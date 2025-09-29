-- Add paymentCutoffDay to student_enrollment_data
ALTER TABLE "student_enrollment_data"
  ADD COLUMN IF NOT EXISTS "paymentCutoffDay" INTEGER DEFAULT 30;



