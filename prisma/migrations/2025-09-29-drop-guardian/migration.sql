-- Drop guardian columns from student_enrollment_data
ALTER TABLE "student_enrollment_data"
  DROP COLUMN IF EXISTS "guardianName",
  DROP COLUMN IF EXISTS "guardianRelation",
  DROP COLUMN IF EXISTS "guardianPhone";


