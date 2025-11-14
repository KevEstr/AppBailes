-- Script SQL simplificado para validar estudiantes con faltas consecutivas
-- Versión más simple y directa para validación rápida

-- Primero, veamos un resumen general de faltas consecutivas por estudiante y clase
WITH 
-- Obtener todas las faltas del último mes
absent_attendances AS (
  SELECT 
    a."studentId",
    a.date,
    cs."classId",
    c.name AS class_name,
    c.sport,
    s.name AS student_name,
    s.id AS student_cedula,
    -- Calcular si es consecutivo (diferencia <= 1 día con la anterior)
    CASE 
      WHEN a.date - LAG(a.date) OVER (
        PARTITION BY a."studentId", cs."classId" 
        ORDER BY a.date
      ) <= INTERVAL '1 day'
      THEN 1
      ELSE 0
    END AS is_consecutive,
    -- Marcar inicio de nueva secuencia
    CASE 
      WHEN a.date - LAG(a.date) OVER (
        PARTITION BY a."studentId", cs."classId" 
        ORDER BY a.date
      ) > INTERVAL '1 day'
      OR LAG(a.date) OVER (
        PARTITION BY a."studentId", cs."classId" 
        ORDER BY a.date
      ) IS NULL
      THEN 1
      ELSE 0
    END AS sequence_start
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

-- Agrupar en secuencias consecutivas
grouped AS (
  SELECT 
    "studentId",
    "classId",
    class_name,
    sport,
    student_name,
    student_cedula,
    date,
    SUM(sequence_start) OVER (
      PARTITION BY "studentId", "classId" 
      ORDER BY date
    ) AS sequence_id
  FROM absent_attendances
),

-- Contar faltas por secuencia
sequence_counts AS (
  SELECT 
    "studentId",
    "classId",
    class_name,
    sport,
    student_name,
    student_cedula,
    sequence_id,
    COUNT(*) AS consecutive_count,
    MIN(date) AS first_date,
    MAX(date) AS last_date
  FROM grouped
  GROUP BY 
    "studentId", 
    "classId", 
    class_name, 
    sport, 
    student_name, 
    student_cedula, 
    sequence_id
  HAVING COUNT(*) >= 3
)

-- RESULTADO 1: Estudiantes con faltas consecutivas en MÚLTIPLES clases
SELECT 
  student_cedula AS "Cédula",
  student_name AS "Nombre",
  COUNT(DISTINCT "classId") AS "Número de Clases",
  STRING_AGG(
    class_name || ' (' || sport || '): ' || consecutive_count || ' faltas', 
    ' | ' 
    ORDER BY class_name
  ) AS "Detalle por Clase",
  SUM(consecutive_count) AS "Total Faltas Consecutivas",
  MIN(first_date)::DATE AS "Primera Falta",
  MAX(last_date)::DATE AS "Última Falta"
FROM sequence_counts
GROUP BY student_cedula, student_name
HAVING COUNT(DISTINCT "classId") > 1
ORDER BY COUNT(DISTINCT "classId") DESC, student_name;

-- RESULTADO 2: Todos los estudiantes con faltas consecutivas (resumen)
SELECT 
  student_cedula AS "Cédula",
  student_name AS "Nombre",
  class_name AS "Clase",
  sport AS "Deporte",
  consecutive_count AS "Faltas Consecutivas",
  first_date::DATE AS "Primera Falta",
  last_date::DATE AS "Última Falta"
FROM sequence_counts
ORDER BY 
  student_name,
  class_name,
  first_date;

-- RESULTADO 3: Conteo por deporte
SELECT 
  sport AS "Deporte",
  COUNT(DISTINCT "studentId") AS "Estudiantes con Faltas Consecutivas",
  COUNT(DISTINCT "classId") AS "Clases Afectadas",
  SUM(consecutive_count) AS "Total Faltas Consecutivas"
FROM sequence_counts
GROUP BY sport
ORDER BY sport;

