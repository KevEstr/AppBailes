-- Script SQL para validar estudiantes con más de 3 faltas consecutivas en varias clases
-- Este script identifica estudiantes que tienen faltas consecutivas en múltiples clases

WITH 
-- Paso 1: Obtener todas las faltas del último mes con información de clase
absent_attendances AS (
  SELECT 
    a.id,
    a."studentId",
    a.date,
    cs."classId",
    c.name AS class_name,
    c.sport,
    s.name AS student_name,
    s.id AS student_cedula,
    ROW_NUMBER() OVER (
      PARTITION BY a."studentId", cs."classId" 
      ORDER BY a.date ASC
    ) AS row_num
  FROM attendances a
  INNER JOIN class_sessions cs ON a."sessionId" = cs.id
  INNER JOIN classes c ON cs."classId" = c.id
  INNER JOIN students s ON a."studentId" = s.id
  WHERE 
    a.status = 'ABSENT'
    AND a.date >= CURRENT_DATE - INTERVAL '1 month'
    AND a.date <= CURRENT_DATE
    AND s."isActive" = true
  ORDER BY a."studentId", cs."classId", a.date
),

-- Paso 2: Calcular diferencias de días entre faltas consecutivas
consecutive_groups AS (
  SELECT 
    "studentId",
    "classId",
    class_name,
    sport,
    student_name,
    student_cedula,
    date,
    row_num,
    date - LAG(date) OVER (
      PARTITION BY "studentId", "classId" 
      ORDER BY date
    ) AS days_since_last_absence,
    -- Marcar inicio de nueva secuencia consecutiva
    CASE 
      WHEN date - LAG(date) OVER (
        PARTITION BY "studentId", "classId" 
        ORDER BY date
      ) > INTERVAL '1 day' 
      OR LAG(date) OVER (
        PARTITION BY "studentId", "classId" 
        ORDER BY date
      ) IS NULL
      THEN 1 
      ELSE 0 
    END AS is_new_sequence
  FROM absent_attendances
),

-- Paso 3: Asignar grupos consecutivos usando suma acumulada
grouped_sequences AS (
  SELECT 
    "studentId",
    "classId",
    class_name,
    sport,
    student_name,
    student_cedula,
    date,
    SUM(is_new_sequence) OVER (
      PARTITION BY "studentId", "classId" 
      ORDER BY date
    ) AS sequence_group
  FROM consecutive_groups
),

-- Paso 4: Contar faltas consecutivas por grupo
consecutive_counts AS (
  SELECT 
    "studentId",
    "classId",
    class_name,
    sport,
    student_name,
    student_cedula,
    sequence_group,
    COUNT(*) AS consecutive_count,
    MIN(date) AS first_absence_date,
    MAX(date) AS last_absence_date
  FROM grouped_sequences
  GROUP BY 
    "studentId", 
    "classId", 
    class_name, 
    sport, 
    student_name, 
    student_cedula, 
    sequence_group
  HAVING COUNT(*) >= 3  -- Solo secuencias de 3+ faltas consecutivas
),

-- Paso 5: Contar cuántas clases diferentes tienen faltas consecutivas por estudiante
students_with_multiple_classes AS (
  SELECT 
    "studentId",
    student_name,
    student_cedula,
    COUNT(DISTINCT "classId") AS classes_with_consecutive_absences,
    STRING_AGG(
      DISTINCT class_name || ' (' || sport || ')', 
      ', ' 
      ORDER BY class_name || ' (' || sport || ')'
    ) AS affected_classes,
    SUM(consecutive_count) AS total_consecutive_absences,
    MAX(consecutive_count) AS max_consecutive_in_class,
    MIN(first_absence_date) AS earliest_absence,
    MAX(last_absence_date) AS latest_absence
  FROM consecutive_counts
  GROUP BY "studentId", student_name, student_cedula
  HAVING COUNT(DISTINCT "classId") > 1  -- Solo estudiantes con faltas en múltiples clases
)

-- Resultado final: Estudiantes con faltas consecutivas en varias clases
SELECT 
  student_cedula AS "Cédula",
  student_name AS "Nombre del Estudiante",
  classes_with_consecutive_absences AS "Clases con Faltas Consecutivas",
  affected_classes AS "Clases Afectadas",
  total_consecutive_absences AS "Total Faltas Consecutivas",
  max_consecutive_in_class AS "Máximo Consecutivas en una Clase",
  earliest_absence::DATE AS "Primera Falta",
  latest_absence::DATE AS "Última Falta"
FROM students_with_multiple_classes
ORDER BY 
  classes_with_consecutive_absences DESC,
  total_consecutive_absences DESC,
  student_name;

-- Query adicional: Detalle por clase para cada estudiante
-- Descomenta esto si quieres ver el detalle completo por clase

/*
WITH 
absent_attendances AS (
  SELECT 
    a.id,
    a."studentId",
    a.date,
    cs."classId",
    c.name AS class_name,
    c.sport,
    s.name AS student_name,
    s.id AS student_cedula
  FROM attendances a
  INNER JOIN class_sessions cs ON a."sessionId" = cs.id
  INNER JOIN classes c ON cs."classId" = c.id
  INNER JOIN students s ON a."studentId" = s.id
  WHERE 
    a.status = 'ABSENT'
    AND a.date >= CURRENT_DATE - INTERVAL '1 month'
    AND a.date <= CURRENT_DATE
    AND s."isActive" = true
),
consecutive_groups AS (
  SELECT 
    "studentId",
    "classId",
    class_name,
    sport,
    student_name,
    student_cedula,
    date,
    CASE 
      WHEN date - LAG(date) OVER (
        PARTITION BY "studentId", "classId" 
        ORDER BY date
      ) > INTERVAL '1 day' 
      OR LAG(date) OVER (
        PARTITION BY "studentId", "classId" 
        ORDER BY date
      ) IS NULL
      THEN 1 
      ELSE 0 
    END AS is_new_sequence
  FROM absent_attendances
),
grouped_sequences AS (
  SELECT 
    "studentId",
    "classId",
    class_name,
    sport,
    student_name,
    student_cedula,
    date,
    SUM(is_new_sequence) OVER (
      PARTITION BY "studentId", "classId" 
      ORDER BY date
    ) AS sequence_group
  FROM consecutive_groups
),
consecutive_counts AS (
  SELECT 
    "studentId",
    "classId",
    class_name,
    sport,
    student_name,
    student_cedula,
    sequence_group,
    COUNT(*) AS consecutive_count,
    MIN(date) AS first_absence_date,
    MAX(date) AS last_absence_date
  FROM grouped_sequences
  GROUP BY 
    "studentId", 
    "classId", 
    class_name, 
    sport, 
    student_name, 
    student_cedula, 
    sequence_group
  HAVING COUNT(*) >= 3
),
students_with_multiple_classes AS (
  SELECT 
    "studentId",
    student_name,
    student_cedula
  FROM consecutive_counts
  GROUP BY "studentId", student_name, student_cedula
  HAVING COUNT(DISTINCT "classId") > 1
)

SELECT 
  cc.student_cedula AS "Cédula",
  cc.student_name AS "Nombre",
  cc.class_name AS "Clase",
  cc.sport AS "Deporte",
  cc.consecutive_count AS "Faltas Consecutivas",
  cc.first_absence_date::DATE AS "Primera Falta",
  cc.last_absence_date::DATE AS "Última Falta"
FROM consecutive_counts cc
INNER JOIN students_with_multiple_classes swmc 
  ON cc."studentId" = swmc."studentId"
ORDER BY 
  cc.student_name,
  cc.class_name,
  cc.first_absence_date;
*/

